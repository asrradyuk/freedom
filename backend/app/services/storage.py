import httpx
from fastapi import HTTPException, status
from fastapi.responses import RedirectResponse

from app.core.config import settings

TG_API = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"


async def save_file(content: bytes, key: str, content_type: str | None = None) -> str:
    if not settings.STORAGE_CHAT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage not configured",
        )

    filename = key.rsplit("/", 1)[-1]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{TG_API}/sendDocument",
            data={"chat_id": settings.STORAGE_CHAT_ID},
            files={"document": (filename, content, content_type or "application/octet-stream")},
        )
        data = resp.json()

    if not data.get("ok"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to store file")

    return data["result"]["document"]["file_id"]


async def delete_file(stored_path: str) -> None:
    pass


async def file_response(stored_path: str, original_name: str, mime_type: str | None):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{TG_API}/getFile", params={"file_id": stored_path})
        data = resp.json()

    if not data.get("ok"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_path = data["result"]["file_path"]
    url = f"https://api.telegram.org/file/bot{settings.BOT_TOKEN}/{file_path}"
    return RedirectResponse(url=url)