<div align="center">
  <img src="frontend/public/logo.png" alt="StatKash" width="200" />
</div>

# 💰 StatKash — Gestión financiera personal

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-F7B93E?style=for-the-badge&logo=jsonwebtokens&logoColor=black)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

</div>

---

<div align="center">

**Aplicación web de finanzas personales:** registra gastos, analiza patrones de consumo, administra deudas y proyecta tu estado financiero a 5 años usando el método bola de nieve.

</div>

---

## ⚡ Inicio rápido

### Requisitos previos

- **Python 3.11+**
- **Node.js 20+** y npm
- **PostgreSQL** corriendo localmente

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd statkash
```

### 2. Base de datos

```bash
psql -U postgres -c "CREATE DATABASE statkash_db;"
psql -U postgres -d statkash_db -f sql/schema.sql
```

Esto crea las tablas e inserta las 11 categorías iniciales.

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Crear `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/statkash_db
JWT_SECRET=cualquier_clave_secreta_larga
FLASK_DEBUG=1
```

```bash
python app.py
# Servidor disponible en http://localhost:5000
```

### 4. Frontend

```bash
cd frontend
npm install
```

Crear `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
# Aplicación disponible en http://localhost:5173
```

---

## 🛠️ Tecnologías

<table>
<thead>
<tr>
<th>Categoría</th>
<th>Tecnología</th>
<th>Uso en el proyecto</th>
</tr>
</thead>
<tbody>
<tr>
<td style="background-color:#e3f2fd;">Lenguaje</td>
<td style="background-color:#e3f2fd;">Python 3.11+</td>
<td style="background-color:#e3f2fd;">Runtime del backend; tipado moderno.</td>
</tr>
<tr>
<td style="background-color:#e3f2fd;">Lenguaje</td>
<td style="background-color:#e3f2fd;">JavaScript (ESM)</td>
<td style="background-color:#e3f2fd;">Frontend completo con módulos ES nativos.</td>
</tr>
<tr>
<td style="background-color:#e8f5e9;">Backend</td>
<td style="background-color:#e8f5e9;">Flask 3.1</td>
<td style="background-color:#e8f5e9;">API REST organizada en Blueprints por dominio.</td>
</tr>
<tr>
<td style="background-color:#e8f5e9;">Backend</td>
<td style="background-color:#e8f5e9;">psycopg2-binary</td>
<td style="background-color:#e8f5e9;">Driver PostgreSQL con context manager para commit/rollback automático.</td>
</tr>
<tr>
<td style="background-color:#e8f5e9;">Backend</td>
<td style="background-color:#e8f5e9;">Pandas + NumPy</td>
<td style="background-color:#e8f5e9;">Cálculos estadísticos de gastos (groupby, agregaciones, promedios).</td>
</tr>
<tr>
<td style="background-color:#fff3e0;">Autenticación</td>
<td style="background-color:#fff3e0;">PyJWT</td>
<td style="background-color:#fff3e0;">Tokens JWT con expiración a 8 horas.</td>
</tr>
<tr>
<td style="background-color:#fff3e0;">Autenticación</td>
<td style="background-color:#fff3e0;">bcrypt</td>
<td style="background-color:#fff3e0;">Hash de contraseñas con salt aleatorio por usuario.</td>
</tr>
<tr>
<td style="background-color:#f3e5f5;">Frontend</td>
<td style="background-color:#f3e5f5;">React 19</td>
<td style="background-color:#f3e5f5;">SPA con hooks; estado local para formularios, filtros y exportación.</td>
</tr>
<tr>
<td style="background-color:#f3e5f5;">Frontend</td>
<td style="background-color:#f3e5f5;">Vite 8</td>
<td style="background-color:#f3e5f5;">Build ultrarrápido y servidor de desarrollo con HMR.</td>
</tr>
<tr>
<td style="background-color:#f3e5f5;">Frontend</td>
<td style="background-color:#f3e5f5;">React Router 7</td>
<td style="background-color:#f3e5f5;">Rutas públicas (login, registro) y rutas protegidas por token.</td>
</tr>
<tr>
<td style="background-color:#f3e5f5;">Frontend</td>
<td style="background-color:#f3e5f5;">Recharts</td>
<td style="background-color:#f3e5f5;">Gráficas de gastos por categoría y evolución mensual.</td>
</tr>
<tr>
<td style="background-color:#f3e5f5;">Frontend</td>
<td style="background-color:#f3e5f5;">Axios</td>
<td style="background-color:#f3e5f5;">Cliente HTTP con interceptor que adjunta el JWT en cada petición.</td>
</tr>
<tr>
<td style="background-color:#f3e5f5;">Frontend</td>
<td style="background-color:#f3e5f5;">jsPDF</td>
<td style="background-color:#f3e5f5;">Generación de reportes PDF en el navegador.</td>
</tr>
<tr>
<td style="background-color:#e0f2f1;">Base de datos</td>
<td style="background-color:#e0f2f1;">PostgreSQL 16+</td>
<td style="background-color:#e0f2f1;">Tablas: usuarios, categorias, gastos, deudas.</td>
</tr>
<tr>
<td style="background-color:#fce4ec;">Despliegue</td>
<td style="background-color:#fce4ec;">Railway</td>
<td style="background-color:#fce4ec;">Backend y frontend desplegados como servicios independientes.</td>
</tr>
<tr>
<td style="background-color:#fce4ec;">Despliegue</td>
<td style="background-color:#fce4ec;">Gunicorn</td>
<td style="background-color:#fce4ec;">Servidor WSGI de producción (definido en Procfile).</td>
</tr>
</tbody>
</table>

---

## 🚀 Características

- ✅ Autenticación segura con JWT + bcrypt
- 📊 Dashboard con estadísticas mensuales en tiempo real
- 🏷️ Categorización de gastos con filtros por período y categoría
- 📈 Gráficas interactivas de consumo (Recharts)
- 💳 Gestión de deudas con simulación del método bola de nieve
- 📅 Proyección financiera a 5 años mes a mes
- 🚦 Semáforo de salud financiera (excelente / buena / ajustada / déficit)
- 📄 Exportación de reportes en CSV y PDF
- 📱 Diseño responsive

---

## 🗺️ Flujo de la aplicación

```mermaid
graph TD
    classDef user fill:#c5cae9,stroke:#5c6bc0,stroke-width:2px,color:#283593
    classDef frontend fill:#fff8e1,stroke:#ffb74d,stroke-width:2px,color:#5d4037
    classDef backend fill:#e8f5e9,stroke:#66bb6a,stroke-width:2px,color:#1b5e20
    classDef db fill:#e0e0e0,stroke:#757575,stroke-width:2px,color:#424242

    User((Usuario)):::user

    subgraph Frontend["Frontend — React + Vite"]
        Login["🔐 Login / Registro"]:::frontend

        subgraph Vistas["Vistas principales"]
            VistaGeneral["📊 Vista General\nresumen gastos + deudas activas\ngráficas + exportar CSV/PDF"]:::frontend
            Transacciones["📋 Transacciones\nCRUD de gastos + filtros"]:::frontend
            MisFinanzas["💼 Mis Finanzas\nsueldo · salud financiera\nahorro mensual"]:::frontend
            DeudasUI["💳 Deudas\ngestión de deudas\nbola de nieve · proyección 5 años"]:::frontend
        end
    end

    subgraph Backend["Backend — Flask API  /api"]
        Auth["auth.py\nregistro · login\nreset password"]:::backend
        GastosB["gastos.py\nCRUD gastos\nfiltros dinámicos"]:::backend
        AnalisisB["analisis.py\nestadísticas pandas\ntotal · promedio · máx · mín"]:::backend
        FinanzasB["finanzas.py\nsueldo · CRUD deudas\nsnowball · proyección\nsalud financiera"]:::backend
        CatB["categorias.py\ngestión de categorías"]:::backend
    end

    DB[("PostgreSQL\nusuarios · gastos\ncategorias · deudas")]:::db

    User -->|credenciales| Login
    Login -->|POST /login| Auth
    Auth -->|JWT 8h| Login
    Login --> VistaGeneral

    VistaGeneral -->|GET /analisis| AnalisisB
    VistaGeneral -->|GET /finanzas\nGET /deudas| FinanzasB
    VistaGeneral -->|GET /gastos| GastosB

    Transacciones -->|CRUD /gastos| GastosB
    Transacciones -->|GET /categorias| CatB

    MisFinanzas -->|GET·PUT /sueldo\nGET /finanzas| FinanzasB

    DeudasUI -->|CRUD /deudas| FinanzasB
    DeudasUI -->|GET /snowball| FinanzasB
    DeudasUI -->|GET /proyeccion| FinanzasB

    GastosB -->|SQL| DB
    AnalisisB -->|SQL| DB
    FinanzasB -->|SQL| DB
    CatB -->|SQL| DB
    Auth -->|SQL| DB
```

---

## 🗄️ Esquema de base de datos

```sql
usuarios   (id, nombre, email, password_hash, sueldo, created_at)
categorias (id, nombre)                          -- globales, no por usuario
gastos     (id, usuario_id, categoria_id, motivo, monto, fecha, created_at)
deudas     (id, usuario_id, nombre, monto_actual, interes_mensual, pago_minimo, created_at)
```

El archivo `sql/schema.sql` incluye el DDL completo y las 11 categorías iniciales (Hogar, Alimentación, Transporte, Salud, Educación, Entretenimiento, Viajes, Tecnología, Impuestos, Seguros, Otros).

---

## 🔌 API Endpoints

Todos llevan el prefijo `/api`. Los endpoints marcados con 🔒 requieren el header `Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/register` | Registrar usuario nuevo |
| POST | `/login` | Iniciar sesión — retorna JWT |
| POST | `/reset-password` | Cambiar contraseña |

### Gastos 🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/gastos` | Listar gastos (filtros: `periodo`, `categoria_id`, `fecha_inicio`, `fecha_fin`) |
| POST | `/gastos` | Registrar gasto |
| PUT | `/gastos/:id` | Editar gasto |
| DELETE | `/gastos/:id` | Eliminar gasto |

### Categorías

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/categorias` | Listar todas las categorías |
| POST | `/categorias` 🔒 | Crear categoría |
| DELETE | `/categorias/:id` 🔒 | Eliminar categoría (solo si no tiene gastos asociados) |

### Finanzas 🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/sueldo` | Obtener sueldo registrado |
| PUT | `/sueldo` | Actualizar sueldo |
| GET | `/finanzas` | Estadísticas del mes: ahorro, salud financiera, gastos por categoría |
| GET | `/deudas` | Listar deudas |
| POST | `/deudas` | Agregar deuda |
| DELETE | `/deudas/:id` | Eliminar deuda |
| GET | `/snowball` | Simulación bola de nieve: orden de pago y meses para quedar libre |
| GET | `/proyeccion` | Proyección financiera mes a mes a 5 años |

### Análisis 🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/analisis` | Estadísticas: total, promedio diario, máximo, mínimo, por categoría y por mes |

---

## 📁 Arquitectura del proyecto

```
statkash/
│
├── sql/
│   └── schema.sql                  DDL completo: tablas y categorías iniciales
│
├── backend/
│   ├── app.py                      Punto de entrada Flask: CORS, blueprints, error handler global
│   ├── config.py                   Carga variables de entorno (DATABASE_URL, JWT_SECRET)
│   ├── db.py                       Context manager de conexión PostgreSQL (commit/rollback automático)
│   ├── requirements.txt            Dependencias Python
│   ├── Procfile                    Comando de inicio para Railway: gunicorn app:app
│   ├── nixpacks.toml               Configuración de build para Railway
│   ├── railway.json                Configuración de despliegue Railway
│   ├── .env                        Variables de entorno locales (no subir a git)
│   │
│   ├── routes/                     Un Blueprint por dominio — cada archivo agrupa servicio + rutas HTTP
│   │   ├── auth.py                 Registro, login y reset de contraseña (JWT + bcrypt)
│   │   ├── gastos.py               CRUD de gastos con filtros dinámicos por período y categoría
│   │   ├── categorias.py           Gestión de categorías globales (compartidas entre usuarios)
│   │   ├── analisis.py             Estadísticas de gastos usando pandas y numpy
│   │   └── finanzas.py             Sueldo, deudas CRUD, simulación snowball y proyección a 5 años
│   │
│   └── utils/
│       ├── errors.py               AppError: excepción personalizada con código HTTP; handler global
│       ├── token.py                Extrae y valida el JWT del header Authorization en cada request
│       └── filters.py              Construye cláusulas WHERE dinámicas (periodo, categoría, rango fechas)
│
└── frontend/
    ├── index.html                  HTML raíz de la SPA
    ├── vite.config.js              Configuración de Vite (plugins, alias)
    ├── package.json                Dependencias y scripts npm
    ├── server.cjs                  Servidor estático para producción (serve)
    ├── railway.json                Configuración de despliegue Railway
    ├── .env                        Variables de entorno Vite (VITE_API_URL)
    │
    ├── public/                     Archivos estáticos servidos tal cual (logo, íconos, favicon)
    │
    ├── dist/                       Build de producción — generado por npm run build, no editar
    │
    └── src/
        ├── main.jsx                Punto de entrada React: monta <App /> en el DOM
        ├── App.jsx                 Router principal: rutas públicas y rutas protegidas por token
        ├── api.js                  Instancia Axios con baseURL e interceptor que adjunta el JWT
        ├── index.css               Estilos globales (variables CSS, reset, tipografía)
        ├── App.css                 Estilos del layout raíz
        │
        ├── assets/                 Imágenes estáticas importadas por componentes (logo, hero)
        │
        ├── components/
        │   ├── Navbar.jsx          Barra de navegación con links y logout
        │   ├── Skeleton.jsx        Placeholders animados durante la carga de datos
        │   └── Toast.jsx           Notificaciones emergentes de éxito / error
        │
        └── pages/
            ├── Dashboard.jsx       Vista principal: gastos, análisis, deudas y finanzas
            ├── Login.jsx           Formulario de inicio de sesión
            ├── Register.jsx        Formulario de registro de cuenta nueva
            ├── ResetPassword.jsx   Recuperación de contraseña
            └── NotFound.jsx        Página 404
```

---

## 🚀 Despliegue en Railway

El proyecto se despliega como **dos servicios independientes** más el plugin de base de datos:

| Servicio | Carpeta raíz | Cómo inicia | Variables requeridas |
|----------|-------------|-------------|----------------------|
| **Backend** | `backend/` | `gunicorn app:app` (Procfile) | `DATABASE_URL`, `JWT_SECRET`, `PORT` |
| **Frontend** | `frontend/` | `npm run build` → `server.cjs` | `VITE_API_URL` (URL pública del backend + `/api`) |
| **PostgreSQL** | Plugin Railway | — | Genera `DATABASE_URL` automáticamente |

> **Nota:** `VITE_API_URL` debe estar configurada **antes del build** del frontend, ya que Vite incrusta la variable en el bundle estático.

---

## 📝 Variables de entorno

### Backend — `backend/.env`

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | `mi_clave_secreta_larga` | Clave para firmar y verificar tokens JWT |
| `FLASK_DEBUG` | `1` | `1` en desarrollo, `0` en producción |

### Frontend — `frontend/.env`

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | URL base del backend (sin barra final) |

---

## 📄 Licencia

Proyecto de uso educativo y personal.
