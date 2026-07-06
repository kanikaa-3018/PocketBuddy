from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    JWT_SECRET: str
    MONGO_URI: str
    PORT: int = 8000
    google_maps_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("google_maps_api_key", "GOOGLE_MAPS_API_KEY"),
    )
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_SESSION_TOKEN: str = ""
    AWS_REGION: str = "ap-south-1"
    CAMPUS_FOOD_S3_BUCKET: str = ""
    CAMPUS_FOOD_S3_KEY: str = "campus_food.json"
    BEDROCK_ENABLED: bool = False
    BEDROCK_REGION: str = "us-east-1"
    BEDROCK_MODEL_ID: str = "us.amazon.nova-lite-v1:0"

    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""

    # Twilio WhatsApp
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""  # e.g. whatsapp:+14155238886

    # Frontend base URL (change to deployed URL in production)
    FRONTEND_BASE_URL: str = "http://localhost:5173"

    # Demo-only phone auth is disabled by default because the current phone
    # path does not integrate a real OTP provider. Email/password remains the
    # normal local/dev auth flow.
    DEMO_PHONE_AUTH_ENABLED: bool = False
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # Account Aggregator sandbox integration. Disabled by default so the app
    # never pretends to verify live bank data without explicit configuration.
    AA_SANDBOX_ENABLED: bool = False
    AA_SANDBOX_PROVIDER: str = "local"
    AA_SANDBOX_BASE_URL: str = ""
    AA_CLIENT_ID: str = ""
    AA_CLIENT_SECRET: str = ""
    AA_FIU_ID: str = ""
    AA_CALLBACK_SECRET: str = ""
settings = Settings()
