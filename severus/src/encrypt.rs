use discortp::{rtp::RtpPacket, MutablePacket};
use xsalsa20poly1305::{
    aead::{AeadInPlace, Error as CryptoError},
    Nonce, XSalsa20Poly1305 as Cipher, NONCE_SIZE, TAG_SIZE,
};

/// Encrypts a Discord RT(C)P packet using the given key.
///
/// Use of this requires that the input packet has had a nonce generated in the correct location,
/// and `payload_len` specifies the number of bytes after the header including this nonce.
///
/// Code adapted from https://docs.rs/songbird/
#[inline]
pub fn encrypt_in_place(
    packet: &mut impl MutablePacket,
    cipher: &Cipher,
    payload_len: usize,
) -> Result<(), CryptoError> {
    let header_len = packet.packet().len() - packet.payload().len();
    let (header, body) = packet.packet_mut().split_at_mut(header_len);
    let (slice_to_use, body_remaining) = (header, &mut body[..payload_len]);

    let mut nonce = Nonce::default();
    let nonce_slice = if slice_to_use.len() == NONCE_SIZE {
        Nonce::from_slice(&slice_to_use[..NONCE_SIZE])
    } else {
        nonce[..RtpPacket::minimum_packet_size()].copy_from_slice(slice_to_use);
        &nonce
    };

    // body_remaining is now correctly truncated by this point.
    // the true_payload to encrypt follows after the first TAG_LEN bytes.
    let tag =
        cipher.encrypt_in_place_detached(nonce_slice, b"", &mut body_remaining[TAG_SIZE..])?;
    body_remaining[..TAG_SIZE].copy_from_slice(&tag[..]);

    Ok(())
}
