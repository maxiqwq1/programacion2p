from flask import Flask, request, Response
from flask_cors import CORS
from routes.auth import auth_bp
from routes.gastos import gastos_bp
from routes.categorias import categorias_bp
from routes.analisis import analisis_bp
import os

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(gastos_bp, url_prefix="/api")
app.register_blueprint(categorias_bp, url_prefix="/api")
app.register_blueprint(analisis_bp, url_prefix="/api")

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        res = Response()
        res.headers["Access-Control-Allow-Origin"] = "*"
        res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        res.status_code = 200
        return res

@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok", "app": "StatKash"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
