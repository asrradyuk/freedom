import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

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
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 5MB")

    avatar_dir = UPLOAD_DIR / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "avatar.jpg").suffix or ".jpg"
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
    path = UPLOAD_DIR / "avatars" / filename
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return FileResponse(path)


@router.delete("/avatar", response_model=UserOut)
async def delete_avatar(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.avatar_url and user.avatar_url.startswith("/api/v1/profile/avatar/"):
        filename = user.avatar_url.split("/")[-1]
        path = UPLOAD_DIR / "avatars" / filename
        if path.exists():
            path.unlink()
    user.avatar_url = None
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/tg-avatar/{tg_id}")
async def get_tg_avatar(tg_id: int):
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            photos_res = await client.get(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/getUserProfilePhotos",
                params={"user_id": tg_id, "limit": 1},
            )
            photos_data = photos_res.json()
            if not photos_data.get("ok") or not photos_data["result"]["photos"]:
                raise HTTPException(status_code=404, detail="No avatar")
            file_id = photos_data["result"]["photos"][0][-1]["file_id"]
            file_res = await client.get(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/getFile",
                params={"file_id": file_id},
            )
            file_path = file_res.json()["result"]["file_path"]
            img_res = await client.get(
                f"https://api.telegram.org/file/bot{settings.BOT_TOKEN}/{file_path}"
            )
            return Response(
                content=img_res.content,
                media_type="image/jpeg",
                headers={"Cache-Control": "public, max-age=86400"},
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Avatar not found")