from pydantic_settings import BaseSettings ,SettingsConfigDict

class Settings (BaseSettings) :
    APP_NAME : str = "SHOPE ASSITANT CHATBOT"
    VERSION : str = "1.0.0"
    DEBUG : bool = False
    GOOGLE_API_KEY : str 
    GROQ_API_KEY : str 
    SUPABASE_KEY : str 
    SUPABASE_URL : str
    BUCKET_NAME : str 
    model_config = SettingsConfigDict(
        env_file='.env',
        extra= 'ignore'
    )

settings = Settings()

print(settings)