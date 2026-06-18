import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "OVO.AI"
    API_V1_STR: str = "/api/v1"

    # Supabase Connection Settings
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "your-supabase-service-role-key"

    # Google/Gmail OAuth 2.0 Credentials
    GOOGLE_CLIENT_ID: str = "your-google-client-id"
    GOOGLE_CLIENT_SECRET: str = "your-google-client-secret"
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/callback"

    # AI Models API Keys
    GEMINI_API_KEY: str = "your-gemini-key"
    NVIDIA_NIM_API_KEY: str = "your-nim-key"

    # Sandbox Mock Mode Setting
    SANDBOX_MODE: bool = False

    # Token Storage Symmetric Encryption Key (32-byte base64-encoded)
    ENCRYPTION_KEY: str = "t-Z8o8WfQ6S8Z1Z_YcR-rT4n2Vp6x9z_3b5f7g9aBcD="

    class Config:
        # Load from .env file inside backend directory
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_file_encoding = 'utf-8'
        extra = 'ignore'

settings = Settings()
