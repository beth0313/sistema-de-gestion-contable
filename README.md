# 🍧 Gestión de Granizados

Sistema web para controlar un local de granizados con licor y sin licor: ventas, inventario con costos automáticos, compras, gastos, proveedores y un dashboard con gráficas.
Stack: **React (Vite) + Node.js/Express + PostgreSQL**.

## Arquitectura del cliente

El frontend se organiza por funcionalidad y separa la interfaz del acceso HTTP:

- `client/src/App.jsx`: composición principal, navegación y estado de sesión.
- `client/src/features/`: pantallas agrupadas por dominio (`auth`, `dashboard`, `sales`, `products`, `inventory`, `operations`). Cada módulo contiene sus componentes de pantalla.
- `client/src/shared/ui.jsx`: componentes y utilidades visuales reutilizables.
- `client/src/infrastructure/api.js`: comunicación HTTP con la API.

Al agregar una pantalla, ubícala en `features/<funcionalidad>/` y registra su componente en la navegación de `App.jsx`. Las reglas de negocio del servidor siguen centralizadas en `server/src/index.js` y pueden migrarse a módulos de dominio y casos de uso como siguiente etapa.

## Qué hace
- **Inicio de sesión:** la primera vez se crea el usuario administrador; después hay que iniciar sesión para ver o cambiar cualquier dato. Las claves se guardan cifradas (scrypt) y la sesión dura 7 días. Tras 10 intentos fallidos se bloquea el acceso 15 minutos.
- **Inventario:** bolsas de granizado (por litros), licor (ml → jeringas por botella), dulces y vasos, con costo, stock y foto. Calcula cuántas jeringas salen de una botella y cuántos vasos de 8, 12, 16 y 20 oz salen de una bolsa.
- **Alertas de stock bajo:** cada insumo puede tener un mínimo. Cuando el stock llega a ese mínimo aparece un aviso amarillo en todas las pantallas y el insumo se marca en rojo en Inventario.
- **Productos:** el vaso (tamaño, precio, dulces, jeringas, foto). El costo se calcula solo; el sabor se elige al vender.
- **Ventas:** tamaño + sabor + jeringa y dulces extra. Una transacción descuenta todo el inventario; si falta stock, la venta se rechaza.
- **Compras:** suben el stock y actualizan el costo del insumo.
- **Confirmación al eliminar:** antes de borrar ventas, compras, productos, insumos, gastos o proveedores se pide confirmación y se explica qué pasará (por ejemplo, que el stock se devuelve).
- **Gastos y proveedores:** luz, agua recargable, arriendo de la máquina y otros; proveedores con total comprado.
- **Dashboard:** ventas, compras, gastos, utilidad y margen del mes, con 5 gráficas.

## Instalación
1. Base de datos: crea la base `granizados` y ejecuta `db/schema.sql` (o `docker compose up -d`).
2. API: `cd server`, copia `.env.example` a `.env`, pon tu contraseña de PostgreSQL y un `JWT_SECRET` (cualquier texto largo), luego `npm install` y `npm run dev` (puerto 3001).
3. Web: `cd client`, `npm install` y `npm run dev` → http://localhost:5173
4. Al abrir la página por primera vez, crea el usuario administrador.

Si ya tenías la base creada con una versión anterior no necesitas hacer nada: al iniciar, la API agrega sola la tabla de usuarios y la columna de stock mínimo.

## Notas
- Respaldo: `pg_dump -U postgres -p 3000 granizados > respaldo.sql`
- Pendiente: editar registros existentes y manejar varios usuarios con roles.
