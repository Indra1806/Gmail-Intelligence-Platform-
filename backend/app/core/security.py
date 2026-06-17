import logging
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

def get_fernet(key: str) -> Fernet:
    """Helper to initialize Fernet with a base64 encoded key."""
    try:
        return Fernet(key.encode('utf-8'))
    except Exception as e:
        logger.error(f"Failed to initialize encryption Fernet client: {e}")
        raise ValueError("Invalid ENCRYPTION_KEY config value. Must be a 32-byte URL-safe base64-encoded key.")

def encrypt_token(plain_text: str | None, key: str) -> str | None:
    """Encrypts a string value using the provided symmetric encryption key."""
    if not plain_text:
        return plain_text
    try:
        f = get_fernet(key)
        return f.encrypt(plain_text.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encrypt token: {e}")
        raise e

def decrypt_token(cipher_text: str | None, key: str) -> str | None:
    """Decrypts a symmetric cipher text back to its plaintext representation."""
    if not cipher_text:
        return cipher_text
    try:
        f = get_fernet(key)
        return f.decrypt(cipher_text.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to decrypt token: {e}")
        raise e
