import { useEffect } from "react"
import { ErrorBox, Status } from "../../components/Ui"
import { Q_DASHBOARD } from "../../lib/queries"
import { useApi } from "../../lib/useApi"
import { DashboardSkeleton } from "../../components/skeletons"
import { useBackofficeRefresh } from "../../lib/useBackofficeRefresh"

const formatoDinero = (valor) =>
  Number(valor || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  })

const formatoFecha = (fecha) =>
  fecha
    ? new Date(fecha).toLocaleString("es-MX")
    : "Sin fecha"

const nombreProveedor = (proveedor) => {
  switch (proveedor) {
    case "PAYPAL":
      return "PayPal"
    case "MERCADO_PAGO":
      return "Mercado Pago"
    default:
      return proveedor || "Sin proveedor"
  }
}

export default function AdminDashboard() {

  // ======================================
  // CONSULTAS GRAPHQL
  // ======================================

  const {
    data,
    loading,
    error,
    reload,
    refresh
  } = useApi(Q_DASHBOARD, {}, [])

  const stats = data?.dashboard

  const pedidos = data?.pedidos || []
  const pagosRecientes = data?.pagosRecientes || []

  // ======================================
  // SUBSCRIPTIONS EN TIEMPO REAL
  // ======================================

  useBackofficeRefresh(refresh, [
    "PRODUCTO",
    "CATEGORIA",
    "USUARIO",
    "PEDIDO",
    "PAGO",
    "FACTURA"
  ])

  // ======================================
  // SINCRONIZACIÓN DE RESPALDO
  // ======================================

  useEffect(() => {
    const intervalo = setInterval(() => {
      if (!document.hidden) {
        refresh()
      }
    }, 30000)

    return () => clearInterval(intervalo)
  }, [refresh])

  // ======================================
  // ESTADOS DE CARGA Y ERROR
  // ======================================

  if (loading && !data) {
    return <DashboardSkeleton />
  }

  if (!stats) {
    return (
      <ErrorBox
        message={
          error || "No se pudo cargar el Dashboard"
        }
        retry={reload}
      />
    )
  }

  // ======================================
  // ESTADÍSTICAS
  // ======================================

  const cards = [
    ["Productos", stats.productos],
    ["Categorías", stats.categorias],
    ["Usuarios", stats.usuarios],
    ["Pedidos", stats.pedidos],
    ["Pendientes", stats.pedidosPendientes],
    ["Pagados", stats.pedidosPagados],
    ["Stock bajo", stats.stockBajo],
    ["Ventas", formatoDinero(stats.ventas)]
  ]

  // ======================================
  // INTERFAZ
  // ======================================

  return (
    <>

      {/* ENCABEZADO */}

      <div className="admin-title">
        <div>
          <span className="eyebrow">
            RESUMEN
          </span>

          <h1>Dashboard</h1>
        </div>

        <button
          onClick={reload}
          disabled={loading}
        >
          {loading
            ? "Actualizando..."
            : "Actualizar"}
        </button>
      </div>

      {/* ERROR DE ACTUALIZACIÓN */}

      {error && data && (
        <div className="state-card error-box">
          No se pudieron actualizar los datos:
          {" "}{error}
        </div>
      )}

      {/* TARJETAS ESTADÍSTICAS */}

      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div
            className="metric-card"
            key={label}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {/* ==================================
          ÚLTIMOS PEDIDOS
      ================================== */}

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">
              ACTIVIDAD
            </span>

            <h2>Últimos pedidos</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {pedidos.slice(0, 6).map((order) => (
                <tr key={order.id}>
                  <td>{order.numeroPedido}</td>

                  <td>
                    {order.usuario?.nombre ||
                      "Invitado"}
                  </td>

                  <td>
                    {formatoFecha(order.fecha)}
                  </td>

                  <td>
                    {formatoDinero(order.total)}
                  </td>

                  <td>
                    <Status value={order.status} />
                  </td>
                </tr>
              ))}

              {pedidos.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    No hay pedidos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================
          FICHAS DE PAGO EN TIEMPO REAL
      ================================== */}

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">
              TRANSACCIONES EN TIEMPO REAL
            </span>

            <h2>Últimas fichas de pago</h2>
          </div>

          <span className="pill">
            En vivo
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Proveedor</th>
                <th>Referencia</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {pagosRecientes.map((pago) => (
                <tr key={pago.id}>

                  <td>
                    <strong>
                      {pago.pedido?.numeroPedido ||
                        `#${pago.pedido?.id || pago.id}`}
                    </strong>
                  </td>

                  <td>
                    {nombreProveedor(
                      pago.proveedor
                    )}
                  </td>

                  <td>
                    {pago.referenciaExterna || "—"}
                  </td>

                  <td>
                    <strong>
                      {formatoDinero(pago.monto)}
                    </strong>
                  </td>

                  <td>
                    {formatoFecha(pago.fecha)}
                  </td>

                  <td>
                    <Status value={pago.estado} />
                  </td>

                </tr>
              ))}

              {pagosRecientes.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    No hay fichas de pago
                    registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================
          INTEGRACIONES
      ================================== */}

      <div className="integration-strip">
        <div>
          <strong>REST</strong>
          <span>PayPal / Mercado Pago</span>
          <small>Integración de pagos</small>
        </div>

        <div>
          <strong>SOAP</strong>
          <span>Facturación XML</span>
          <small>Pendiente</small>
        </div>

        <div>
          <strong>MCP</strong>
          <span>Asistente IA</span>
          <small>Pendiente</small>
        </div>

        <div>
          <strong>gRPC</strong>
          <span>App móvil</span>
          <small>Pendiente</small>
        </div>
      </div>

    </>
  )
}
