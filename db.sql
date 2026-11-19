CREATE TABLE IF NOT EXISTS categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    imagen TEXT,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    categoria_id INTEGER NOT NULL REFERENCES categoria(id)
);

CREATE TABLE IF NOT EXISTS usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'CLIENTE' CHECK (rol IN ('CLIENTE', 'ADMIN')),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pedido (
    id SERIAL PRIMARY KEY,
    numero_pedido VARCHAR(30) NOT NULL UNIQUE,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO')),
    usuario_id INTEGER REFERENCES usuario(id),
    nombre_receptor VARCHAR(150),
    calle VARCHAR(150),
    numero_exterior VARCHAR(30),
    numero_interior VARCHAR(30),
    colonia VARCHAR(120),
    ciudad VARCHAR(120),
    estado VARCHAR(120),
    codigo_postal VARCHAR(15),
    referencias TEXT,
    notas TEXT
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES producto(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)
);


ALTER TABLE categoria ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS numero_pedido VARCHAR(30);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS nombre_receptor VARCHAR(150);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS calle VARCHAR(150);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS numero_exterior VARCHAR(30);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS numero_interior VARCHAR(30);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS colonia VARCHAR(120);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS ciudad VARCHAR(120);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS estado VARCHAR(120);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(15);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS referencias TEXT;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE detalle_pedido ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0;
UPDATE detalle_pedido SET subtotal = precio * cantidad WHERE subtotal = 0;
UPDATE pedido SET numero_pedido = 'QM-OLD-' || id WHERE numero_pedido IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pedido_numero_pedido_unique ON pedido(numero_pedido);

CREATE TABLE IF NOT EXISTS pago (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
    proveedor VARCHAR(30) NOT NULL CHECK (proveedor IN ('PAYPAL', 'MERCADO_PAGO')),
    referencia_externa VARCHAR(150),
    monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    estado VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_INTEGRACION',
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factura (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
    folio VARCHAR(60),
    estado VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_SOAP',
    xml TEXT,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categoria (id, nombre, activo) VALUES
(1, 'Manuales', TRUE),
(2, 'Dados', TRUE),
(3, 'Accesorios', TRUE),
(4, 'Miniaturas', TRUE),
(5, 'Mapas', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO producto (id, nombre, descripcion, precio, imagen, stock, activo, categoria_id) VALUES
(1, 'Manual del Jugador', 'Manual esencial con reglas para crear personajes y jugar aventuras de D&D.', 950, '/images/manual-jugador.jpg', 10, TRUE, 1),
(2, 'Manual del Dungeon Master', 'Guía para crear y dirigir campañas, encuentros y mundos de aventura.', 1050, '/images/manual-dm.jpg', 8, TRUE, 1),
(3, 'Set de dados arcanos', 'Set de dados poliédricos para partidas de juegos de rol.', 300, '/images/dados-arcanos.jpg', 25, TRUE, 2),
(4, 'Pantalla para Dungeon Master', 'Pantalla para ocultar notas y organizar información durante la partida.', 650, '/images/pantalla-dm.jpg', 8, TRUE, 3),
(5, 'Bolsa para dados', 'Bolsa para guardar y transportar dados y pequeños accesorios.', 220, '/images/bolsa-dados.jpg', 20, TRUE, 3),
(6, 'Miniatura de pícaro', 'Miniatura de aventurero pícaro para tus encuentros.', 180, '/images/picaro.jpg', 30, TRUE, 4),
(7, 'Miniatura de dragón rojo', 'Miniatura de dragón rojo para encuentros y combates de campaña.', 750, '/images/dragon.jpg', 6, TRUE, 4)
ON CONFLICT DO NOTHING;

INSERT INTO usuario (id, nombre, email, password, rol, activo) VALUES
(1, 'Cliente Demo', 'cliente@questmerchant.com', '123456', 'CLIENTE', TRUE),
(2, 'Administrador', 'admin@questmerchant.com', 'admin123', 'ADMIN', TRUE)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('categoria', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM categoria), 1));
SELECT setval(pg_get_serial_sequence('producto', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM producto), 1));
SELECT setval(pg_get_serial_sequence('usuario', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM usuario), 1));
