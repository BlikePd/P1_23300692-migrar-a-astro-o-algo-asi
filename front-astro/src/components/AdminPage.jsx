import AdminShell from "./AdminShell"
import AdminDashboard from "../views/admin/AdminDashboard"
import AdminProductos from "../views/admin/AdminProductos"
import AdminCategorias from "../views/admin/AdminCategorias"
import AdminInventario from "../views/admin/AdminInventario"
import AdminPedidos from "../views/admin/AdminPedidos"
import AdminPagos from "../views/admin/AdminPagos"
import AdminFacturacion from "../views/admin/AdminFacturacion"
import AdminUsuarios from "../views/admin/AdminUsuarios"
import { useAuthStore } from "../store/authStore"
import { navigate } from "../lib/navigate"

export default function AdminPage({ page }) {
    const usuario = useAuthStore((state) => state.usuario)
    const logout = useAuthStore((state) => state.logout)

    if (!usuario) {
        navigate("/login")
        return null
    }

    if (usuario.rol !== "ADMIN") {
        navigate("/")
        return null
    }

    let content = <AdminDashboard />

    if (page === "productos") content = <AdminProductos />
    if (page === "categorias") content = <AdminCategorias />
    if (page === "inventario") content = <AdminInventario />
    if (page === "pedidos") content = <AdminPedidos />
    if (page === "pagos") content = <AdminPagos />
    if (page === "facturas") content = <AdminFacturacion />
    if (page === "usuarios") content = <AdminUsuarios currentAdmin={usuario} />

    return (
        <AdminShell
            navigate={navigate}
            admin={usuario}
            logout={() => {
                logout()
                navigate("/")
            }}
            route={window.location.pathname}
        >
            {content}
        </AdminShell>
    )
}