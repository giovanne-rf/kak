from pathlib import Path
import re
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from .database import Base, SessionLocal, engine, get_db
from .models import Building, Equipment, User
from .schemas import EquipmentCreate, LoginPayload, TokenResponse, UserCreate
from .security import create_access_token, decode_access_token, hash_password, verify_password


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "buildings"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

EQUIPMENT_TYPE_MIGRATION = {
    "Camera": "Câmera",
    "Sensor de presenca": "Sensor de presença",
    "Tag": "TAG",
    "Tablet facial": "Leitor facial",
}

app = FastAPI(title="Sistema de Gestao de Dispositivos")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR.parent), name="uploads")


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "role": user.role,
    }


def serialize_building(building: Building) -> dict:
    return {
        "id": building.id,
        "name": building.name,
        "address": building.address,
        "photo_url": f"/uploads/buildings/{building.photo_path}" if building.photo_path else None,
        "manager_name": building.manager_name,
        "manager_phone": building.manager_phone,
        "equipment_count": len(building.equipments),
    }


def serialize_equipment(equipment: Equipment) -> dict:
    return {
        "id": equipment.id,
        "building_id": equipment.building_id,
        "building_name": equipment.building.name if equipment.building else None,
        "equipment_type": equipment.equipment_type,
        "manufacturer": equipment.manufacturer,
        "model": equipment.model,
        "ip": equipment.ip,
        "installation_location": equipment.installation_location,
        "access_login": equipment.access_login,
        "access_password": equipment.access_password,
    }


def ensure_schema() -> None:
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "role" not in user_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'viewer'")
                )


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) not in {10, 11}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telefone do sindico deve ter DDD e 8 ou 9 digitos",
        )
    if len(digits) == 10:
        return f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"


def migrate_existing_data(db: Session) -> None:
    changed = False
    admin = db.query(User).filter(User.username == "admin").first()
    if admin and admin.role != "admin":
        admin.role = "admin"
        changed = True

    users_without_role = db.query(User).filter((User.role == None) | (User.role == "")).all()  # noqa: E711
    for user in users_without_role:
        user.role = "viewer"
        changed = True

    equipments = db.query(Equipment).filter(Equipment.equipment_type.in_(list(EQUIPMENT_TYPE_MIGRATION))).all()
    for equipment in equipments:
        equipment.equipment_type = EQUIPMENT_TYPE_MIGRATION[equipment.equipment_type]
        changed = True

    if changed:
        db.commit()


def bootstrap_database() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    with SessionLocal() as db:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            db.add(
                User(
                    name="Administrador",
                    username="admin",
                    email="admin@local.com",
                    hashed_password=hash_password("Admin@123"),
                    role="admin",
                )
            )
            db.commit()
        migrate_existing_data(db)


@app.on_event("startup")
def on_startup() -> None:
    bootstrap_database()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login necessario")

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario viewer pode apenas visualizar",
        )
    return current_user


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginPayload, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario ou senha invalidos")

    return TokenResponse(
        access_token=create_access_token(user.username),
        user=serialize_user(user),
    )


@app.get("/api/me")
def me(current_user: User = Depends(get_current_user)) -> dict:
    return serialize_user(current_user)


@app.get("/api/dashboard")
def dashboard(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    buildings = db.query(Building).options(joinedload(Building.equipments)).all()
    equipment_total = db.query(func.count(Equipment.id)).scalar() or 0
    users_total = db.query(func.count(User.id)).scalar() or 0
    return {
        "totals": {
            "buildings": len(buildings),
            "equipments": equipment_total,
            "users": users_total,
        },
        "buildings": [serialize_building(building) for building in buildings],
    }


@app.post("/api/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    user = User(
        name=payload.name,
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Usuario ou email ja cadastrado") from exc
    db.refresh(user)
    return serialize_user(user)


@app.get("/api/users")
def list_users(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    users = db.query(User).order_by(User.name).all()
    return [serialize_user(user) for user in users]


@app.post("/api/buildings", status_code=status.HTTP_201_CREATED)
async def create_building(
    name: str = Form(...),
    address: str = Form(...),
    manager_name: str = Form(...),
    manager_phone: str = Form(...),
    photo: UploadFile | None = File(default=None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    normalized_phone = normalize_phone(manager_phone)
    filename = None
    if photo and photo.filename:
        suffix = Path(photo.filename).suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de foto invalido")
        filename = f"{uuid4().hex}{suffix}"
        target = UPLOAD_DIR / filename
        target.write_bytes(await photo.read())

    building = Building(
        name=name,
        address=address,
        manager_name=manager_name,
        manager_phone=normalized_phone,
        photo_path=filename,
    )
    db.add(building)
    db.commit()
    db.refresh(building)
    return serialize_building(building)


@app.get("/api/buildings")
def list_buildings(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    buildings = db.query(Building).options(joinedload(Building.equipments)).order_by(Building.name).all()
    return [serialize_building(building) for building in buildings]


@app.get("/api/buildings/{building_id}")
def get_building(
    building_id: int,
    equipment_type: str | None = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    building = (
        db.query(Building)
        .options(joinedload(Building.equipments).joinedload(Equipment.building))
        .filter(Building.id == building_id)
        .first()
    )
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio nao encontrado")

    equipments = building.equipments
    if equipment_type:
        equipments = [equipment for equipment in equipments if equipment.equipment_type == equipment_type]

    return {
        **serialize_building(building),
        "equipments": [serialize_equipment(equipment) for equipment in equipments],
    }


@app.post("/api/equipments", status_code=status.HTTP_201_CREATED)
def create_equipment(
    payload: EquipmentCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    building = db.query(Building).filter(Building.id == payload.building_id).first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio nao encontrado")

    equipment = Equipment(**payload.model_dump())
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    return serialize_equipment(equipment)


@app.get("/api/equipments")
def list_equipments(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    equipments = db.query(Equipment).options(joinedload(Equipment.building)).order_by(Equipment.id.desc()).all()
    return [serialize_equipment(equipment) for equipment in equipments]
