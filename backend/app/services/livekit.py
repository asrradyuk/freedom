import uuid
from datetime import timedelta

from livekit.api import AccessToken, VideoGrants

from app.core.config import settings


def create_room_name(specialist_tg_id: int) -> str:
    return f"room-{specialist_tg_id}-{uuid.uuid4().hex[:8]}"


def generate_token(room: str, participant_identity: str, participant_name: str) -> str:
    if not participant_identity:
        participant_identity = f"user-{uuid.uuid4().hex[:8]}"

    token = AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    token.with_identity(participant_identity)
    token.with_name(participant_name)
    token.with_grants(VideoGrants(
        room_join=True,
        room=room,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
    ))
    token.with_ttl(timedelta(hours=4))
    return token.to_jwt()