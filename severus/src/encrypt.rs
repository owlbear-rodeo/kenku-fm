//! Encryption schemes supported by Discord's secure RTP negotiation.
use aead::AeadCore;
use aes_gcm::{AeadInPlace, Aes256Gcm, Error as CryptoError};
use byteorder::{NetworkEndian, WriteBytesExt};
use chacha20poly1305::XChaCha20Poly1305;
use crypto_common::{InvalidLength, KeyInit};
use discortp::MutablePacket;
use std::{num::Wrapping, str::FromStr};
use typenum::Unsigned;

/// Encryption schemes supportd by Discord.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Default, Hash)]
#[non_exhaustive]
pub enum CryptoMode {
    #[default]
    /// Discord's currently preferred non-E2EE encryption scheme.
    ///
    /// Packets are encrypted and decrypted using the `AES256GCM` encryption scheme.
    /// An additional random 4B suffix is used as the source of nonce bytes for the packet.
    /// This nonce value increments by `1` with each packet.
    ///
    /// Encrypted content begins *after* the RTP header and extensions, following the SRTP
    /// specification.
    ///
    /// Nonce width of 4B (32b), at an extra 4B per packet (~0.2 kB/s).
    Aes256Gcm,
    /// A fallback non-E2EE encryption scheme.
    ///
    /// Packets are encrypted and decrypted using the `XChaCha20Poly1305` encryption scheme.
    /// An additional random 4B suffix is used as the source of nonce bytes for the packet.
    /// This nonce value increments by `1` with each packet.
    ///
    /// Encrypted content begins *after* the RTP header and extensions, following the SRTP
    /// specification.
    ///
    /// Nonce width of 4B (32b), at an extra 4B per packet (~0.2 kB/s).
    XChaCha20Poly1305,
}

impl From<CryptoState> for CryptoMode {
    fn from(val: CryptoState) -> Self {
        match val {
            CryptoState::Aes256Gcm(_) => Self::Aes256Gcm,
            CryptoState::XChaCha20Poly1305(_) => Self::XChaCha20Poly1305,
        }
    }
}

/// The input string could not be parsed as an encryption scheme supported by songbird.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub struct UnrecognisedCryptoMode;

impl FromStr for CryptoMode {
    type Err = UnrecognisedCryptoMode;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "aead_aes256_gcm_rtpsize" => Ok(Self::Aes256Gcm),
            "aead_xchacha20_poly1305_rtpsize" => Ok(Self::XChaCha20Poly1305),
            _ => Err(UnrecognisedCryptoMode),
        }
    }
}

impl CryptoMode {
    /// Returns the underlying crypto algorithm used by a given [`CryptoMode`].
    #[must_use]
    pub(crate) const fn algorithm(self) -> EncryptionAlgorithm {
        match self {
            CryptoMode::Aes256Gcm => EncryptionAlgorithm::Aes256Gcm,
            CryptoMode::XChaCha20Poly1305 => EncryptionAlgorithm::XChaCha20Poly1305,
        }
    }

    /// Returns an encryption cipher based on the supplied key.
    ///
    /// Creation fails if the key is the incorrect length for the target cipher.
    pub(crate) fn cipher_from_key(self, key: &[u8]) -> Result<Cipher, InvalidLength> {
        match self.algorithm() {
            EncryptionAlgorithm::Aes256Gcm => Aes256Gcm::new_from_slice(key)
                .map(Box::new)
                .map(Cipher::Aes256Gcm),
            EncryptionAlgorithm::XChaCha20Poly1305 => {
                XChaCha20Poly1305::new_from_slice(key).map(Cipher::XChaCha20Poly1305)
            }
        }
    }

    /// Returns the number of bytes each nonce is stored as within
    /// a packet.
    #[must_use]
    pub const fn nonce_size(self) -> usize {
        match self {
            Self::Aes256Gcm | Self::XChaCha20Poly1305 => 4,
        }
    }

    /// Returns the tag length in bytes.
    #[must_use]
    pub(crate) const fn encryption_tag_len(self) -> usize {
        self.algorithm().encryption_tag_len()
    }

    /// Returns the number of bytes occupied by the encryption scheme
    /// which fall after the payload.
    #[must_use]
    pub const fn payload_suffix_len(self) -> usize {
        self.nonce_size() + self.encryption_tag_len()
    }

    /// Returns the number of bytes occupied by an encryption scheme's tag which
    /// fall *after* the payload.
    #[must_use]
    pub const fn tag_suffix_len(self) -> usize {
        self.encryption_tag_len()
    }

    /// Extracts the byte slice in a packet used as the nonce, and the remaining mutable
    /// portion of the packet.
    fn nonce_slice<'a>(
        self,
        _header: &'a [u8],
        body: &'a mut [u8],
    ) -> Result<(&'a [u8], &'a mut [u8]), CryptoError> {
        match self {
            Self::Aes256Gcm | Self::XChaCha20Poly1305 => {
                let len = body.len();
                if len < self.payload_suffix_len() {
                    Err(CryptoError)
                } else {
                    let (body_left, nonce_loc) = body.split_at_mut(len - self.nonce_size());
                    Ok((nonce_loc, body_left))
                }
            }
        }
    }
}

/// State used in nonce generation for the encryption variants in [`CryptoMode`].
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum CryptoState {
    /// An additional random 4B suffix is used as the source of nonce bytes for the packet.
    /// This nonce value increments by `1` with each packet.
    ///
    /// The last used nonce is stored.
    Aes256Gcm(Wrapping<u32>),
    /// An additional random 4B suffix is used as the source of nonce bytes for the packet.
    /// This nonce value increments by `1` with each packet.
    ///
    /// The last used nonce is stored.
    XChaCha20Poly1305(Wrapping<u32>),
}

impl From<CryptoMode> for CryptoState {
    fn from(val: CryptoMode) -> Self {
        match val {
            CryptoMode::Aes256Gcm => CryptoState::Aes256Gcm(Wrapping(rand::random::<u32>())),
            CryptoMode::XChaCha20Poly1305 => {
                CryptoState::XChaCha20Poly1305(Wrapping(rand::random::<u32>()))
            }
        }
    }
}

impl CryptoState {
    /// Writes packet nonce into the body, if required, returning the new length.
    pub fn write_packet_nonce(
        &mut self,
        packet: &mut impl MutablePacket,
        payload_end: usize,
    ) -> usize {
        let mode = self.kind();
        let endpoint = payload_end + mode.payload_suffix_len();
        let startpoint = endpoint - mode.nonce_size();

        match self {
            Self::Aes256Gcm(ref mut i) | Self::XChaCha20Poly1305(ref mut i) => {
                (&mut packet.payload_mut()[startpoint..endpoint])
                    .write_u32::<NetworkEndian>(i.0)
                    .expect(
                        "Nonce size is guaranteed to be sufficient to write u32 for lite tagging.",
                    );
                *i += Wrapping(1);
            }
        }

        endpoint
    }

    /// Returns the underlying (stateless) type of the active crypto mode.
    #[must_use]
    pub fn kind(self) -> CryptoMode {
        CryptoMode::from(self)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub(crate) enum EncryptionAlgorithm {
    Aes256Gcm,
    XChaCha20Poly1305,
}

impl EncryptionAlgorithm {
    #[must_use]
    pub(crate) const fn encryption_tag_len(self) -> usize {
        match self {
            Self::Aes256Gcm => <Aes256Gcm as AeadCore>::TagSize::USIZE, // 16
            Self::XChaCha20Poly1305 => <XChaCha20Poly1305 as AeadCore>::TagSize::USIZE, // 16
        }
    }
}

impl From<&Cipher> for EncryptionAlgorithm {
    fn from(value: &Cipher) -> Self {
        match value {
            Cipher::XChaCha20Poly1305(_) => EncryptionAlgorithm::XChaCha20Poly1305,
            Cipher::Aes256Gcm(_) => EncryptionAlgorithm::Aes256Gcm,
        }
    }
}

#[derive(Clone)]
pub enum Cipher {
    XChaCha20Poly1305(XChaCha20Poly1305),
    Aes256Gcm(Box<Aes256Gcm>),
}

impl Cipher {
    #[must_use]
    pub(crate) fn mode(&self) -> CryptoMode {
        match self {
            Cipher::XChaCha20Poly1305(_) => CryptoMode::XChaCha20Poly1305,
            Cipher::Aes256Gcm(_) => CryptoMode::Aes256Gcm,
        }
    }

    #[must_use]
    pub(crate) fn encryption_tag_len(&self) -> usize {
        EncryptionAlgorithm::from(self).encryption_tag_len()
    }

    /// Encrypts a Discord RT(C)P packet using the given key.
    ///
    /// Use of this requires that the input packet has had a nonce generated in the correct location,
    /// and `payload_len` specifies the number of bytes after the header including this nonce.
    #[inline]
    pub fn encrypt_pkt_in_place(
        &self,
        packet: &mut impl MutablePacket,
        payload_len: usize,
    ) -> Result<(), CryptoError> {
        let mode = self.mode();
        let header_len = packet.packet().len() - packet.payload().len();

        let (header, body) = packet.packet_mut().split_at_mut(header_len);
        let (nonce_slice, payload_and_tag_slice) =
            mode.nonce_slice(header, &mut body[..payload_len])?;

        let (payload_slice, tag_slice) =
            payload_and_tag_slice.split_at_mut(payload_and_tag_slice.len() - mode.tag_suffix_len());

        let tag_size = self.encryption_tag_len();
        // All these Nonce types are distinct at the type level
        // (96b for AES, 192b for XChaCha).
        match self {
            // The below variants follow part of the SRTP spec (RFC3711, sec 3.1)
            // by requiring that we include the cleartext header portion as
            // authenticated data.
            Self::Aes256Gcm(aes_gcm) => {
                let mut nonce = aes_gcm::Nonce::default();
                nonce[..mode.nonce_size()].copy_from_slice(nonce_slice);

                let tag = aes_gcm.encrypt_in_place_detached(&nonce, header, payload_slice)?;
                tag_slice[..tag_size].copy_from_slice(&tag[..]);
            }
            Self::XChaCha20Poly1305(cha_cha_poly1305) => {
                let mut nonce = chacha20poly1305::XNonce::default();
                nonce[..mode.nonce_size()].copy_from_slice(nonce_slice);

                let tag =
                    cha_cha_poly1305.encrypt_in_place_detached(&nonce, header, payload_slice)?;
                tag_slice[..tag_size].copy_from_slice(&tag[..]);
            }
        }

        Ok(())
    }
}
