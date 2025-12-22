use sha2::{Sha256, Digest};

/// Hash password using SHA256
pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hex::encode(hasher.finalize())
}

/// Verify password against hash
pub fn verify_password(password: &str, hash: &str) -> bool {
    hash_password(password) == hash
}
