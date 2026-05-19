from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.gastos import gastos_bp
from routes.categorias import categorias_bp
from routes.analisis import analisis_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(gastos_bp, url_prefix="/api")
app.register_blueprint(categorias_bp, url_prefix="/api")
app.register_blueprint(analisis_bp, url_prefix="/api")

@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok", "app": "StatKash"}

if __name__ == "__main__":
    app.run(debug=True, port=5000)
