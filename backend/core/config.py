import os
from typing import Optional
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from keycloak.keycloak_openid import KeycloakOpenID

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
ENV_FILE = os.path.join(BASE_DIR, "backend", ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding='utf-8',
        case_sensitive=True,
        extra='ignore'
    )
    
    # MongoDB Configuration
    MONGO_URI: str = Field(...)  # Required field
    DB_NAME: str = Field(default="p_inno_db")
    
    PROJECT_NAME: str = Field(default="FASTAPI_BASE")
    SECRET_KEY: str = Field(...)  # Required field
    API_PREFIX: str = Field(default="/api")
    API_VERSIONS: str = Field(default="")
    API_VERSION: str = Field(default="v1")
    BACKEND_CORS_ORIGINS: str = Field(default='["*"]')
    DATABASE_URL: Optional[str] = Field(default=None)
    ACCESS_TOKEN_EXPIRE_SECONDS: int = Field(default=60 * 60 * 24 * 7)  # Token expired after 7 days
    SECURITY_ALGORITHM: str = Field(default="HS256")
    LOGGING_CONFIG_FILE: str = Field(default_factory=lambda: os.path.join(BASE_DIR, "logging.ini"))
    DEBUG: bool = Field(default=False)
    KEYCLOAK_SERVER_URL: Optional[str] = Field(default=None)
    KEYCLOAK_REALM: Optional[str] = Field(default=None)
    KEYCLOAK_CLIENT_ID: Optional[str] = Field(default=None)
    KEYCLOAK_CLIENT_SECRET: Optional[str] = Field(default=None)
    KEYCLOAK_VERIFY: bool = Field(default=False)
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    OPENAI_API_KEY: Optional[str] = Field(default="")
    SCRIPT_MODEL: str = Field(default="gpt-4o-mini")
    FEEDBACK_MODEL: str = Field(default="gpt-4o-mini")
    GENERATION_TEMPERATURE: float = Field(default=0.4)
    OPENAI_TIMEOUT: int = Field(default=60)
    
    # Google Gemini Configuration
    GEMINI_API_KEY: Optional[str] = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash-exp")
    WEB_DOMAIN: str = Field(default="")
    CHECK_TOKEN_URL: str = Field(default="")
    DAILY_LIMIT_TIME: int = Field(default=900)  


settings = Settings()

@lru_cache
def get_settings() -> Settings:
    return settings

if (
    settings.KEYCLOAK_SERVER_URL != None
    and settings.KEYCLOAK_REALM != None
    and settings.KEYCLOAK_CLIENT_ID != None
    and settings.KEYCLOAK_CLIENT_SECRET != None
    and settings.KEYCLOAK_VERIFY != None
):
    keycloak_openid = KeycloakOpenID(
        server_url=settings.KEYCLOAK_SERVER_URL,
        realm_name=settings.KEYCLOAK_REALM,
        client_id=settings.KEYCLOAK_CLIENT_ID,
        client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
        verify=settings.KEYCLOAK_VERIFY,
    )
else:
    keycloak_openid = None


def get_openid_config():
    if keycloak_openid == None:
        return {}
    return keycloak_openid.well_known()

