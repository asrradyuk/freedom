import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, Material, SubscriptionStatus, User
from app.schemas.schemas import MaterialOut

router = APIRouter()

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


async def _get_client_or_404(client_id: uuid.UUID, user: User, db: AsyncSession) -> Client:
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.specialist_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.get("/", response_model=list[MaterialOut])
async def list_materials(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)
    result = await db.execute(
        select(Material).where(Material.client_id == client_id).order_by(Material.uploaded_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def upload_material(
    client_id: uuid.UUID,
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.subscription_status != SubscriptionStatus.active:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Subscription required")

    await _get_client_or_404(client_id, user, db)

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    dest_dir = UPLOAD_DIR / str(client_id)
    dest_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    dest_path = dest_dir / unique_name

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(content)

    material = Material(
        client_id=client_id,
        filename=str(dest_path),
        original_name=file.filename,
        file_size=len(content),
        mime_type=file.content_type,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return material


@router.get("/{material_id}/download")
async def download_material(
    client_id: uuid.UUID,
    material_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)

    result = await db.execute(
        select(Material).where(Material.id == material_id, Material.client_id == client_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    path = Path(material.filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return FileResponse(path=path, filename=material.original_name, media_type=material.mime_type)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    client_id: uuid.UUID,
    material_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)

    result = await db.execute(
        select(Material).where(Material.id == material_id, Material.client_id == client_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    path = Path(material.filename)
    if path.exists():
        path.unlink()

    await db.delete(material)
    await db.commit()