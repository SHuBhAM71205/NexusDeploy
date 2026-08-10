import uuid
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, EmailStr, Field

from app.db.models.User import UserStatus


# Base model
class Base(BaseModel):
    pass


# Login Model
class LoginRequest(Base):
    email: EmailStr
    password: Annotated[str, Field(min_length=8, description="The user's account password")]


class LoginResponse(Base):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    username: str


# register model

class RegisterRequest(Base):
    email: EmailStr
    username: Annotated[str, Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$", examples=["Ram", "Shyam"],
                                   description="Your name")]
    password: Annotated[str, Field(min_length=8, max_length=128, description="Plain text password from client")]


class RegisterResponse(Base):
    id: uuid.UUID
    email: EmailStr
    username: Optional[str]
    status: UserStatus
    is_verified: bool
    created_at: datetime


# profile

class UserProfileResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: Optional[str]
    is_verified: bool


# tokens

class RefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
