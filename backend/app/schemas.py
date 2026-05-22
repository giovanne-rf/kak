from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class LoginPayload(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Literal["admin", "viewer"] = "viewer"


class EquipmentCreate(BaseModel):
    building_id: int
    equipment_type: Literal["Câmera", "Sensor de presença", "Leitor facial", "TAG"]
    manufacturer: str = Field(min_length=2, max_length=120)
    model: str = Field(min_length=1, max_length=120)
    ip: str = Field(min_length=3, max_length=60)
    installation_location: str = Field(min_length=2, max_length=160)
    access_login: str = Field(min_length=1, max_length=120)
    access_password: str = Field(min_length=1, max_length=255)
