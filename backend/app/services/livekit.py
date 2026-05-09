import uuid

from livekit.api import AccessToken, VideoGrants

from app.core.config import settings


def create_room_name(specialist_tg_id: int) -> str:
    return f"room-{specialist_tg_id}-{uuid.uuid4().hex[:8]}"


def generate_token(room: str, participant_identity: str, participant_name: str) -> str:
    token = AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    token.with_identity(participant_identity)
    token.with_name(participant_name)
    token.with_grants(VideoGrants(room_join=True, room=room))
    return token.to_jwt()