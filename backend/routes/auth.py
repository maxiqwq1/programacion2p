from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
import psycopg2
from db import get_connection
from config import JWT_SECRET

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    nombre = data.get("nombre")
    email = data.get("email")
    password = data.get("password")

    if not all([nombre, email, password]):
        return jsonify({"error": "Todos los campos son obligatorios."}), 400

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    conn = get_connection()
    cur = conn.cursor()

    # Verificar si el email ya existe
    cur.execute("SELECT id FROM usuarios WHERE email = %s;", (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"error": "El email ya está registrado."}), 409

    cur.execute(
        "INSERT INTO usuarios (nombre, email, password_hash) VALUES (%s, %s, %s) RETURNING id;",
        (nombre, email, password_hash)
    )
    user_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Usuario creado correctamente.", "id": user_id}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "Email y contraseña son obligatorios."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nombre, password_hash FROM usuarios WHERE email = %s;", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        return jsonify({"error": "Credenciales incorrectas."}), 401

    user_id, nombre, password_hash = user

    if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
        return jsonify({"error": "Credenciales incorrectas."}), 401

    token = jwt.encode({
        "user_id": user_id,
        "nombre": nombre,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({"token": token, "nombre": nombre, "user_id": user_id})
