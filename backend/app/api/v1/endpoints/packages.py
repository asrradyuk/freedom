import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, Package, Session, SessionStatus, SubscriptionStatus, User
from app.schemas.schemas import PackageCreate, PackageOut, PackageUpdate

router = APIRouter()


async def _get_client_or_404(client_id: uuid.UUID, user: User, db: AsyncSession) -> Client:
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.specialist_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.get("/", response_model=list[PackageOut])
async def list_packages(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)
    result = await db.execute(
        select(Package).where(Package.client_id == client_id).order_by(Package.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=PackageOut, status_code=status.HTTP_201_CREATED)
async def create_package(
    client_id: uuid.UUID,
    payload: PackageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.subscription_status != SubscriptionStatus.active:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Subscription required")
    await _get_client_or_404(client_id, user, db)
    pkg = Package(
        client_id=client_id,
        name=payload.name,
        total_sessions=payload.total_sessions,
        remaining_sessions=payload.total_sessions,
        price=payload.price,
    )
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return pkg


@router.patch("/{package_id}", response_model=PackageOut)
async def update_package(
    client_id: uuid.UUID,
    package_id: uuid.UUID,
    payload: PackageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)
    result = await db.execute(
        select(Package).where(Package.id == package_id, Package.client_id == client_id)
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pkg, field, value)
    await db.commit()
    await db.refresh(pkg)
    return pkg


@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_package(
    client_id: uuid.UUID,
    package_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)
    result = await db.execute(
        select(Package).where(Package.id == package_id, Package.client_id == client_id)
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    await db.delete(pkg)
    await db.commit()