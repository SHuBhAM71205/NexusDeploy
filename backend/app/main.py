import os

from dotenv import load_dotenv;

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings

# router
from app.api.routes import (auth)

#constants
origin = [
    settings.REACT_APP_FRONTEND_URL,
    "http://localhost:5173"
]



#fastapi app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origin,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY")) #type: ignore

oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    authorize_url=os.getenv("GC_AUTH_URI"),
    access_token_url=os.getenv("GC_TOKEN_URI"),
    jwks_uri=os.getenv("GC_AUTH_PROVIDER"),
    client_kwargs={
        'scope': 'openid email profile'
    }
)

@app.get("/")
def root():
    return {"text":"This is the api for the resume analysis"}


# add_router
app.include_router(auth.router)





