# beUI en Quest Merchant — qué se cambió

## Cómo usar este paquete
1. Reemplaza tu carpeta `front-astro` por esta (o copia estos archivos sobre la tuya).
2. En la carpeta `front-astro` ejecuta:
   ```powershell
   npm install
   npm run dev
   ```
3. Deja corriendo el backend (`back`) para ver datos reales.

## Archivos nuevos
- `src/components/motion/animated-toast-stack.tsx`  → componente de beUI (MIT)
- `src/components/Toaster.jsx`                      → monta los avisos (una sola vez)
- `src/store/toastStore.js`                         → estado global + `toast.success/error/info/loading`
- `src/lib/utils.ts`, `src/lib/ease.ts`             → utilidades que usa beUI
- `src/styles/global.css`                           → Tailwind v4 + tema + tu `styles.css`

## Archivos modificados
- `astro.config.mjs` (plugin de Tailwind), `package.json`, `tsconfig.json`
- `src/layouts/BaseLayout.astro` (importa `global.css`)
- `src/react-app/App.jsx` (renderiza `<Toaster />`)
- `ProductDetail.jsx`, `Checkout.jsx`, `AuthForm.jsx`, `AdminProducts.jsx`, `AdminCategories.jsx`, `AdminOrders.jsx` (lanzan avisos)

## Lanzar un aviso desde cualquier archivo
```js
import { toast } from "../store/toastStore"
toast.success("Guardado", "Texto opcional")
toast.error("Algo falló", err.message)
toast.info("Producto desactivado")
```

## Notas
- Tailwind se importa SIN preflight y tu `styles.css` queda en una capa de menor prioridad, así tu diseño no cambia.
- `styles.css` ahora se carga desde `global.css`. Si ya lo importabas en otro lado, quita ese import duplicado.
- `npm run build` falla por algo previo del proyecto (`output: "server"` sin adaptador); `npm run dev` funciona bien.
