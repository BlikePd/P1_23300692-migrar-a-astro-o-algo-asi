# Quest Merchant — proyecto padre

Proyecto integrado de tienda de D&D con área de cliente y panel administrativo.

## Incluido en esta etapa

- React + Vite para la interfaz.
- Apollo Client para consumir GraphQL.
- Apollo Server en el backend.
- PostgreSQL como base central.
- Catálogo, categorías, detalle de producto, carrito y checkout.
- Historial de pedidos del cliente demo.
- Panel `/admin` protegido por inicio de sesión.
- Dashboard administrativo.
- CRUD de productos.
- CRUD lógico de categorías.
- Gestión de inventario.
- Gestión de estados de pedidos.
- Registro local de intentos de pago con PayPal o Mercado Pago.
- Preparación local de facturas para la futura integración SOAP/XML.
- Administración de usuarios y roles.
- Secciones preparadas para REST, SOAP, MCP y gRPC sin integrar todavía servicios externos.

## Base de datos

Crea una base PostgreSQL vacía llamada `quest_merchant`. El backend ejecuta `db.sql` al arrancar y crea las tablas y datos iniciales si no existen.

Copia `back/.env.example` como `back/.env` y cambia los datos de PostgreSQL si es necesario.

También puedes usar una URL de conexión:

```env
PORT=4000
DATABASE_URL=postgresql://usuario:password@host:5432/quest_merchant
DB_SSL=true
```

## Arrancar backend

```powershell
cd back
npm install
npm start
```

Apollo GraphQL queda en:

```text
http://localhost:4000/
```

## Arrancar frontend

En otra terminal:

```powershell
cd front
npm install
npm run dev
```

Vite normalmente queda en:

```text
http://localhost:5173/
```

## Cuentas demo

Cliente usado por el checkout:

```text
cliente@questmerchant.com
123456
```

Administrador:

```text
admin@questmerchant.com
admin123
```

## Rutas principales

```text
/
/producto/:id
/carrito
/checkout
/pedidos
/admin
/admin/productos
/admin/categorias
/admin/inventario
/admin/pedidos
/admin/pagos
/admin/facturas
/admin/usuarios
```

## Siguiente etapa

El proyecto deja claramente separados los puntos donde se conectarán:

- REST: PayPal y Mercado Pago.
- SOAP/XML: facturación.
- MCP: herramientas para asistente de IA.
- gRPC: aplicación móvil.
- Servicio de IA/Spring: recomendaciones o asistente de compra.

Las acciones de aprobar/rechazar pagos dentro del panel son simulaciones locales para poder probar el flujo administrativo antes de conectar los proveedores reales.
