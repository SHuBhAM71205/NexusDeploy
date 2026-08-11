from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import Response

from app.api.controllers.auth_controller import AuthController
from app.api.models import auth_model
from app.api.services.auth_services import AuthServices
from app.core.security import AccessToken, Hash


class DummySession(dict):
    pass


class DummyRequest:
    def __init__(self):
        self.session = DummySession()
        self.cookies = {}
        self.state = type("State", (), {})()


class DummyDB:
    def __init__(self):
        self.rows = []

    def add(self, obj):
        self.rows.append(obj)

    async def commit(self):
        pass


@pytest.mark.asyncio
async def test_create_access_token_persists_refresh_token_record():
    db = DummyDB()
    token_service = AccessToken("test-secret-key", "HS256")

    access_token, refresh_token = await token_service.create_access_token(
        "3f6d4ef6-5d6d-4cb8-b885-57d70197a3f2",
        db,
        Hash(),
    )

    assert access_token
    assert refresh_token
    assert len(db.rows) == 1
    assert db.rows[0].user_id == "3f6d4ef6-5d6d-4cb8-b885-57d70197a3f2"
    assert db.rows[0].is_revoked is False


@pytest.mark.asyncio
async def test_refresh_controller_rotates_refresh_token_and_returns_new_pair(monkeypatch):
    secret_key = "test-secret-key"
    now = datetime.now(timezone.utc)
    old_refresh_token = jwt.encode(
        {"sub": "3f6d4ef6-5d6d-4cb8-b885-57d70197a3f2", "type": "refresh", "exp": now + timedelta(days=1)},
        secret_key,
        algorithm="HS256",
    )
    old_hash = Hash().generatehash(old_refresh_token)

    class TokenRecord:
        def __init__(self, user_id, token_hash, expires_at, is_revoked):
            self.user_id = user_id
            self.token_hash = token_hash
            self.expires_at = expires_at
            self.is_revoked = is_revoked
            self.revoked_at = None

    db_tokens = [
        TokenRecord(
            user_id="3f6d4ef6-5d6d-4cb8-b885-57d70197a3f2",
            token_hash=old_hash,
            expires_at=now + timedelta(days=7),
            is_revoked=False,
        )
    ]

    auth_services = AuthServices()
    auth_services._AuthServices__token = AccessToken(secret_key, "HS256")

    async def fake_get_user_tokens(user_id, db):
        return db_tokens

    auth_services.get_user_tokens = fake_get_user_tokens
    auth_services.verify_hash = lambda token, stored_hash: Hash().verifyhash(token, stored_hash)

    async def fake_create_access_token(user_id, db):
        return "new-access-token", "new-refresh-token"

    auth_services.create_access_token = fake_create_access_token

    async def fake_commit():
        return None

    db = DummyDB()
    db.commit = fake_commit
    monkeypatch.setattr("app.api.controllers.auth_controller.auth_services", auth_services)

    request = DummyRequest()
    response = Response()
    result = await AuthController().refresh_controller(
        request=request,
        response=response,
        refresh_token=old_refresh_token,
        db=db,
    )

    assert result.access_token == "new-access-token"
    assert result.refresh_token == "new-refresh-token"
    assert result.token_type == "bearer"
    assert db_tokens[0].is_revoked is True
