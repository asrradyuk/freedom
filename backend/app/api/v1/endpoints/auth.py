from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.models.models import User
from app.schemas.schemas import UserOut

router = APIRouter()


@router.post("/auth", response_model=UserOut)
async def authenticate(user: User = Depends(get_current_user)):
    return user