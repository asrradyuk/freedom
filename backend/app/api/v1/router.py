from fastapi import APIRouter

from app.api.v1.endpoints import auth, clients, livekit, materials, sessions, subscription, packages
from app.api.v1.endpoints.client_view import router as client_view_router
from app.api.v1.endpoints.profile import router as profile_router
from app.api.v1.endpoints.sessions_upcoming import router as upcoming_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profile_router, prefix="/profile", tags=["profile"])
api_router.include_router(client_view_router, prefix="/clients", tags=["client-view"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(upcoming_router, prefix="/sessions", tags=["sessions"])
api_router.include_router(sessions.router, prefix="/clients/{client_id}/sessions", tags=["sessions"])
api_router.include_router(materials.router, prefix="/clients/{client_id}/materials", tags=["materials"])
api_router.include_router(packages.router, prefix="/clients/{client_id}/packages", tags=["packages"])
api_router.include_router(livekit.router, prefix="/livekit", tags=["livekit"])
api_router.include_router(subscription.router, prefix="/subscription", tags=["subscription"])