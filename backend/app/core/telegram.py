import hashlib
import hmac
import json
from urllib.parse import parse_qsl, unquote


def verify_telegram_init_data(init_data: str, bot_token: str) -> dict | None:
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        return None

    user_str = parsed.get("user")
    if not user_str:
        return None

    return json.loads(unquote(user_str))