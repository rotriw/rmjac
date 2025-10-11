use sha2::{Digest, Sha512};
use crate::Result;
use pgp::composed::{Deserializable, CleartextSignedMessage, SignedPublicKey};

pub fn encode_password(data: &String) -> String {
    base16ct::lower::encode_string(&Sha512::digest(data.as_bytes()))
}

pub fn verify(pub_key: String, msg_un: String, socket_id: String) -> Result<bool> {
    let (pub_key, _headers_public) = SignedPublicKey::from_string(&pub_key).unwrap();
    let (msg, _header_msg) = CleartextSignedMessage::from_string(&msg_un)?;
    let value = msg.verify(&pub_key);
    if value.is_ok() {
        Ok(msg.text() == format!("Rotriw_Edge_Server_{socket_id}"))
    } else {
        log::info!("verify error: {:?}", value);
        Ok(false)
    }
}

pub fn change_string_format(data: String) -> String {
    data.replace("  ", "\n")
        .replace("-----BEGIN\nPGP\nSIGNED\nMESSAGE-----", "-----BEGIN PGP SIGNED MESSAGE-----")
        .replace("-----END\nPGP\nSIGNED\nMESSAGE-----", "-----END PGP SIGNED MESSAGE-----")
        .replace("-----BEGIN\nPGP\nSIGNED\nSIGNATURE-----", "-----BEGIN PGP SIGNED SIGNATURE-----")
}