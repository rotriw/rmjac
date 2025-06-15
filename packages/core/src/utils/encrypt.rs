use sha2::{Digest, Sha512};

pub fn encode_password(data: &String) -> String {
    base16ct::lower::encode_string(&Sha512::digest(data.as_bytes()))
}
