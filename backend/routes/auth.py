from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
from db import Database
from config import JWT_SECRET
from utils.errors import AppError

auth_bp = Blueprint("auth", __name__)


class AuthService:
    """Business logic for user registration, login, and password reset."""

    @staticmethod
    def register(nombre: str, email: str, password: str) -> int:
        """Create a new user and return the new user_id."""
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        with Database.connect() as (cur, _):
            cur.execute("SELECT id FROM usuarios WHERE email = %s;", (email,))
            if cur.fetchone():
                raise AppError("El email ya está registrado.", 409)

            cur.execute(
                "INSERT INTO usuarios (nombre, email, password_hash) VALUES (%s, %s, %s) RETURNING id;",
                (nombre, email, password_hash),
            )
            return cur.fetchone()[0]

    @staticmethod
    def login(email: str, password: str) -> dict:
        """Validate credentials and return token + user info."""
        with Database.connect() as (cur, _):
            cur.execute(
                "SELECT id, nombre, password_hash FROM usuarios WHERE email = %s;",
                (email,),
            )
            user = cur.fetchone()

        if not user:
            raise AppError("Credenciales incorrectas.", 401)

        user_id, nombre, password_hash = user

        if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
            raise AppError("Credenciales incorrectas.", 401)

        token = jwt.encode(
            {
                "user_id": user_id,
                "nombre":  nombre,
                "exp":     datetime.datetime.utcnow() + datetime.timedelta(hours=8),
            },
            JWT_SECRET,
            algorithm="HS256",
        )
        return {"token": token, "nombre": nombre, "user_id": user_id}

    @staticmethod
    def reset_password(email: str, nueva_password: str) -> None:
        """Update the password for an existing account."""
        with Database.connect() as (cur, _):
            cur.execute("SELECT id FROM usuarios WHERE email = %s;", (email,))
            if not cur.fetchone():
                raise AppError("No existe una cuenta con ese email.", 404)

            nuevo_hash = bcrypt.hashpw(
                nueva_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")
            cur.execute(
                "UPDATE usuarios SET password_hash = %s WHERE email = %s;",
                (nuevo_hash, email),
            )


# ── Routes ────────────────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    data     = request.get_json()
    nombre   = data.get("nombre")
    email    = data.get("email")
    password = data.get("password")

    if not all([nombre, email, password]):
        return jsonify({"error": "Todos los campos son obligatorios."}), 400

    user_id = AuthService.register(nombre, email, password)
    return jsonify({"message": "Usuario creado correctamente.", "id": user_id}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "Email y contraseña son obligatorios."}), 400

    return jsonify(AuthService.login(email, password))


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data           = request.get_json()
    email          = data.get("email")
    nueva_password = data.get("nueva_password")

    if not all([email, nueva_password]):
        return jsonify({"error": "Email y nueva contraseña son obligatorios."}), 400

    AuthService.reset_password(email, nueva_password)
    return jsonify({"message": "Contraseña actualizada correctamente."})
