import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserOut, UserUpdate
from app.services.storage import delete_file, save_file, file_response

router = APIRouter()


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

    ext = Path(file.filename or "avatar.jpg").suffix or ".jpg"
    key = f"avatars/{uuid.uuid4()}{ext}"

    old_url = user.avatar_url
    stored = await save_file(content, key, file.content_type)

    if settings.r2_enabled and settings.R2_PUBLIC_URL:
        user.avatar_url = f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
    elif settings.r2_enabled:
        user.avatar_url = f"/api/v1/profile/avatar-file/{key}"
    else:
        user.avatar_url = f"/api/v1/profile/avatar-file/{key}"

    await db.commit()
    await db.refresh(user)

    if old_url and "/api/v1/profile/avatar-file/" in (old_url or ""):
        old_key = old_url.split("/api/v1/profile/avatar-file/")[-1]
        try:
            await delete_file(old_key if settings.r2_enabled else str(Path(settings.UPLOAD_DIR) / old_key))
        except Exception:
            pass

    return user


@router.get("/avatar-file/{file_path:path}")
async def get_avatar_file(file_path: str):
    return file_response(file_path, file_path.split("/")[-1], "image/jpeg")


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