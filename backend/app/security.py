import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from fastapi import HTTPException, status
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")
TOKEN_TTL_SECONDS = 60 * 60 * 8


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(subject: str) -> str:
    payload = {
        "sub": subject,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    body = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(SECRET_KEY.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    return f"{body}.{_b64encode(signature)}"


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        body, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido") from exc

    expected_signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    provided_signature = _b64decode(signature)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    try:
        payload = json.loads(_b64decode(body).decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido") from exc

    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao expirada")

    return payload
