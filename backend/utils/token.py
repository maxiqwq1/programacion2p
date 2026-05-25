import jwt
from config import JWT_SECRET
from utils.errors import AppError


class TokenHelper:
    """Extracts and validates JWT tokens from incoming requests."""

    @staticmethod
    def get_user_id(request) -> int:
        """Return user_id from a valid Bearer token, or raise AppError(401)."""
        raw   = request.headers.get("Authorization", "")
        token = raw.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return payload["user_id"]
        except jwt.PyJWTError:
            raise AppError("No autorizado.", 401)
