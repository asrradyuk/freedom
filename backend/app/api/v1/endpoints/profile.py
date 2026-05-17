from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from pathlib import Path
import aiofiles

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserOut, UserUpdate

router = APIRouter()

UPLOAD_DIR = Path(settings.UPLOAD_DIR)


@router.get("/", response_model=UserOut)
async def get_profile(user: User = Depends(get_current_user)):
    return user


@router.patch("/", response_model=UserOut)
async def update_profile(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 5MB)")

    avatar_dir = UPLOAD_DIR / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    path = avatar_dir / filename

    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    user.avatar_url = f"/api/v1/profile/avatar/{filename}"
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/avatar/{filename}")
async def get_avatar(filename: str):
    from fastapi.responses import FileResponse
    from fastapi import HTTPException, status
    path = UPLOAD_DIR / "avatars" / filename
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return FileResponse(path)