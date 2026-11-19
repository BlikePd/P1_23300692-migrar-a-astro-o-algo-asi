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


---

# P10 — Quest Merchant como PWA instalable (Unidad 3.2)

Autor: Isaac Palafox Ramirez · Matrícula 23300692

## Qué se hizo

- Se instaló y configuró `@vite-pwa/astro` (+ `vite-plugin-pwa`) en `front-astro/astro.config.mjs`.
- **Manifiesto** (generado por el plugin como `manifest.webmanifest`): `name`, `short_name`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `theme_color`, `background_color`, `icons`, además de `id`, `lang`, `orientation` y `categories`.
- **Iconos** en `front-astro/public/icons/`: `icon-192.png`, `icon-512.png` y `icon-maskable-512.png` (logo dentro del ~62 % central, por debajo del 80 % pedido), más `apple-touch-icon.png` para iOS.
- **Colores tomados de los tokens de diseño** de `src/styles/styles.css`:
  - `theme_color` = `--accent` → `#7389c3`
  - `background_color` = `--bg` → `#e9f0f9`
  - el logo usa `--text` (`#30435f`) sobre `--bg`.
- `BaseLayout.astro`: enlaza el manifiesto (`pwaInfo`), `theme-color`, `apple-touch-icon` y registra el service worker.
- **Bono:** `src/components/InstallPWA.jsx`, botón propio "Instalar Quest Merchant" con `beforeinstallprompt` (se oculta si la app ya está instalada).
- El service worker solo hace precache de estáticos; el **offline real queda para la P3-3**.

## Cómo probarla

```bash
cd front-astro
npm install
npm run build
npm run preview      # o abrir el deploy de Netlify (HTTPS)
```

1. Abrir la URL en Chrome → F12 → **Application → Manifest** (revisar identidad, colores, iconos, "Installability") y **Service workers**.
2. **Lighthouse**: las versiones nuevas (12+) ya no traen la categoría "PWA"; la instalabilidad se verifica en Application → Manifest. Si tu Lighthouse la tiene, marca "Progressive Web App".
3. Instalar: icono de instalar en la barra de direcciones / botón "Instalar Quest Merchant" (teléfono: menú ⋮ → *Instalar app*; o emulación con DevTools).
4. Nota: el modo `dev` también registra el SW (`devOptions.enabled`), pero la verificación formal debe hacerse sobre el build/deploy.
