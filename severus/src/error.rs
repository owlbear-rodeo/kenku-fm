use crypto_secretbox::aead::Error as CryptoError;
use std::{error::Error as StdError, fmt, io::Error as IoError};
use tokio::time::error::Elapsed;

/// Errors encountered while connecting to a Discord voice server over the driver.
#[derive(Debug)]
#[non_exhaustive]
pub enum Error {
    /// An error occurred during [en/de]cryption of voice packets or key generation.
    Crypto(CryptoError),
    /// Discord failed to correctly respond to IP discovery.
    IllegalDiscoveryResponse,
    /// Could not parse Discord's view of our IP.
    IllegalIp,
    /// Miscellaneous I/O error.
    Io(IoError),
    /// Connection attempt timed out.
    TimedOut,
}

impl From<CryptoError> for Error {
    fn from(e: CryptoError) -> Self {
        Error::Crypto(e)
    }
}

impl From<IoError> for Error {
    fn from(e: IoError) -> Error {
        Error::Io(e)
    }
}

impl From<Elapsed> for Error {
    fn from(_e: Elapsed) -> Error {
        Error::TimedOut
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "failed to connect to Discord RTP server: ")?;
        use Error::*;
        match self {
            Crypto(e) => e.fmt(f),
            IllegalDiscoveryResponse => write!(f, "IP discovery/NAT punching response was invalid"),
            IllegalIp => write!(f, "IP discovery/NAT punching response had bad IP value"),
            Io(e) => e.fmt(f),
            TimedOut => write!(f, "connection attempt timed out"),
        }
    }
}

impl StdError for Error {
    fn source(&self) -> Option<&(dyn StdError + 'static)> {
        match self {
            Error::Crypto(e) => e.source(),
            Error::IllegalDiscoveryResponse => None,
            Error::IllegalIp => None,
            Error::Io(e) => e.source(),
            Error::TimedOut => None,
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;
