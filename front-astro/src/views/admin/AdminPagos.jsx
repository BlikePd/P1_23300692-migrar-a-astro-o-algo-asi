import { ErrorBox, Status } from "../../components/Ui"
import { Q_ADMIN_PAGOS } from "../../lib/queries"
import { useApi } from "../../lib/useApi"
import { TableSkeleton } from "../../components/skeletons"
import { useBackofficeRefresh } from "../../lib/useBackofficeRefresh"

export default function AdminPayments() {
  const api = useApi(Q_ADMIN_PAGOS, {}, [])
  useBackofficeRefresh(api.refresh, [
  "PAGO",
  "PEDIDO"
  ])

  if (api.loading) {
    return <TableSkeleton rows={7} columns={5} title="Pagos" />
  }

  if (api.error) {
    return <ErrorBox message={api.error} retry={api.reload} />
  }

  const pagos = api.data?.pagos || []

  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">TRANSACCIONES</span>
          <h1>Pagos</h1>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Proveedor</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.pedido.numeroPedido}</strong></td>
                  <td>{payment.proveedor.replaceAll("_", " ")}</td>
                  <td>${Number(payment.monto).toLocaleString("es-MX")}</td>
                  <td>{new Date(payment.fecha).toLocaleString("es-MX")}</td>
                  <td><Status value={payment.estado} /></td>
                </tr>
              ))}

              {pagos.length === 0 && (
                <tr>
                  <td colSpan={5}>Todavía no hay pagos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}