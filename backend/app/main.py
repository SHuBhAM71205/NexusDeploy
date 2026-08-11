from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY,session_cookie="fastapi_session",same_site="lax",https_only=False)

@app.get("/")
def root():
    return {"text":"This is the api for the resume analysis"}


# add_router
app.include_router(auth.router)





