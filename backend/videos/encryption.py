import os
from cryptography.fernet import Fernet

def _get_fernet():
    key = os.getenv('FIELD_ENCRYPTION_KEY')
    if not key:
        raise ValueError('FIELD_ENCRYPTION_KEY environment variable is not set.')
    return Fernet(key.encode())

def encrypt(plaintext):
    return _get_fernet().encrypt(plaintext.encode()).decode()

def decrypt(ciphertext):
    return _get_fernet().decrypt(ciphertext.encode()).decode()
