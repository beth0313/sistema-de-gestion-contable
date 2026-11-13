-- Granizados · esquema PostgreSQL
CREATE TABLE ajustes (clave text PRIMARY KEY, valor numeric NOT NULL);
INSERT INTO ajustes VALUES ('jeringa_ml', 3);

CREATE TYPE tipo_insumo AS ENUM ('granizado','licor','dulce','vaso','otro');

-- contenido y stock en ml (granizado, licor) o unidades (dulce, vaso, otro)
CREATE TABLE insumos (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  tipo tipo_insumo NOT NULL,
  contenido numeric(14,3) NOT NULL CHECK (contenido > 0),   -- por bolsa / botella / paquete
  costo numeric(14,2) NOT NULL DEFAULT 0 CHECK (costo >= 0), -- por bolsa / botella / paquete
  stock numeric(16,3) NOT NULL DEFAULT 0 CHECK (stock >= 0), -- nunca negativo
  foto text
);
CREATE TABLE proveedores (id serial PRIMARY KEY, nombre text NOT NULL, telefono text, vende text);

-- El producto es el vaso (sin sabor): tamaño + lo que trae
CREATE TABLE productos (
  id serial PRIMARY KEY, nombre text,
  tamano_oz int NOT NULL CHECK (tamano_oz IN (8,12,16,20)),
  precio numeric(12,2) NOT NULL CHECK (precio >= 0),
  vaso_id int REFERENCES insumos ON DELETE RESTRICT,
  licor_id int REFERENCES insumos ON DELETE RESTRICT,
  jeringas int NOT NULL DEFAULT 0 CHECK (jeringas >= 0),
  foto text
);
CREATE TABLE producto_dulces (
  producto_id int REFERENCES productos ON DELETE CASCADE,
  insumo_id int REFERENCES insumos ON DELETE RESTRICT,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  PRIMARY KEY (producto_id, insumo_id)
);

-- El sabor se elige en la venta
CREATE TABLE ventas (
  id serial PRIMARY KEY, fecha date NOT NULL DEFAULT CURRENT_DATE,
  producto_id int REFERENCES productos ON DELETE SET NULL,
  sabor text NOT NULL, tamano_oz int NOT NULL,
  cantidad int NOT NULL CHECK (cantidad > 0),
  precio_unit numeric(12,2) NOT NULL, costo_unit numeric(14,4) NOT NULL
);
CREATE TABLE venta_consumos (  -- para devolver el stock si se borra la venta
  venta_id int REFERENCES ventas ON DELETE CASCADE,
  insumo_id int REFERENCES insumos ON DELETE CASCADE,
  cantidad numeric(16,3) NOT NULL
);
CREATE TABLE compras (
  id serial PRIMARY KEY, fecha date NOT NULL DEFAULT CURRENT_DATE,
  proveedor_id int REFERENCES proveedores ON DELETE SET NULL,
  insumo_id int REFERENCES insumos ON DELETE SET NULL,
  descripcion text, presentaciones numeric NOT NULL DEFAULT 1 CHECK (presentaciones > 0),
  total numeric(14,2) NOT NULL CHECK (total >= 0), agregado numeric(16,3) NOT NULL DEFAULT 0
);
CREATE TABLE gastos (
  id serial PRIMARY KEY, fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL CHECK (tipo IN ('Luz','Agua recargable','Arriendo máquina','Otro')),
  nota text, valor numeric(14,2) NOT NULL CHECK (valor >= 0)
);
CREATE INDEX ON ventas (fecha); CREATE INDEX ON compras (fecha); CREATE INDEX ON gastos (fecha);
