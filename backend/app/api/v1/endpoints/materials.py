import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, Material, SubscriptionStatus, User
from app.schemas.schemas import MaterialOut
from app.services.storage import delete_file, file_response, save_file

router = APIRouter()

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

    key = f"materials/{client_id}/{uuid.uuid4()}_{Path(file.filename).name}"
    stored = await save_file(content, key, file.content_type)

    material = Material(
        client_id=client_id,
        filename=stored,
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
    return await file_response(material.filename, material.original_name, material.mime_type)


@router.get("/{material_id}/client-download")
async def client_download_material(
    client_id: uuid.UUID,
    material_id: uuid.UUID,
    tg_id: int,
    db: AsyncSession = Depends(get_db),
):
    client_result = await db.execute(
        select(Client).where(Client.id == client_id, Client.client_tg_id == tg_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await db.execute(
        select(Material).where(Material.id == material_id, Material.client_id == client_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return await file_response(material.filename, material.original_name, material.mime_type)


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

    await delete_file(material.filename)
    await db.delete(material)
    await db.commit()