import asyncio
from pathlib import Path

import aiofiles
from fastapi.responses import FileResponse, RedirectResponse

from app.core.config import settings


def _r2_client():
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


async def save_file(content: bytes, key: str, content_type: str | None = None) -> str:
    if settings.r2_enabled:
        client = _r2_client()
        extra = {"ContentType": content_type} if content_type else {}
        await asyncio.to_thread(
            client.put_object,
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=content,
            **extra,
        )
        return key
    else:
        path = Path(settings.UPLOAD_DIR) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path, "wb") as f:
            await f.write(content)
        return str(path)


async def delete_file(stored_path: str) -> None:
    if settings.r2_enabled:
        client = _r2_client()
        await asyncio.to_thread(
            client.delete_object,
            Bucket=settings.R2_BUCKET_NAME,
            Key=stored_path,
        )
    else:
        path = Path(stored_path)
        if path.exists():
            path.unlink()


def file_response(stored_path: str, original_name: str, mime_type: str | None):
    if settings.r2_enabled:
        if settings.R2_PUBLIC_URL:
            url = f"{settings.R2_PUBLIC_URL.rstrip('/')}/{stored_path}"
            return RedirectResponse(url=url)
        client = _r2_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET_NAME, "Key": stored_path},
            ExpiresIn=3600,
        )
        return RedirectResponse(url=url)
    else:
        path = Path(stored_path)
        return FileResponse(path=path, filename=original_name, media_type=mime_type)