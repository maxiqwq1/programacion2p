-- La tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    sueldo NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tabla de deudas para el método bola de nieve
CREATE TABLE IF NOT EXISTS deudas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    monto_actual NUMERIC(12,2) NOT NULL,
    interes_mensual NUMERIC(5,2) DEFAULT 0,
    pago_minimo NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--  categorías
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

--  gastos
CREATE TABLE IF NOT EXISTS gastos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INT NOT NULL REFERENCES categorias(id),
    motivo VARCHAR(255) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--categorías iniciales
INSERT INTO categorias (nombre) VALUES
    ('Hogar'),
    ('Alimentación'),
    ('Transporte'),
    ('Salud'),
    ('Educación'),
    ('Entretenimiento'),
    ('Viajes'),
    ('Tecnología'),
    ('Impuestos'),
    ('Seguros'),
    ('Otros')
ON CONFLICT (nombre) DO NOTHING;