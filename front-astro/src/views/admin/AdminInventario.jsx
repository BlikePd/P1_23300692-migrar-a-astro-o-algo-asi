import { useEffect, useState } from "react"
import { ErrorBox, Status } from "../../components/Ui"
import { mutateGraphQL } from "../../lib/apollo"
import { M_AJUSTAR_STOCK, Q_ADMIN_PRODUCTOS } from "../../lib/queries"
import { useApi } from "../../lib/useApi"
import { TableSkeleton } from "../../components/skeletons"
import { useBackofficeRefresh } from "../../lib/useBackofficeRefresh"

export default function AdminInventory() {
  const api = useApi(Q_ADMIN_PRODUCTOS, {}, [])

  const [values, setValues] = useState({})
  const [message, setMessage] = useState("")
  const [savingId, setSavingId] = useState(null)

  const productos = api.data?.productos || []

  useBackofficeRefresh(api.refresh, [
    "PRODUCTO"
  ])

  useEffect(() => {
    if (!api.data?.productos) return

    setValues((anteriores) => {
      let nuevos = anteriores

      for (const producto of api.data.productos) {

        if (
          !Object.prototype.hasOwnProperty.call(
            anteriores,
            producto.id
          )
        ) {
          if (nuevos === anteriores) {
            nuevos = { ...anteriores }
          }

          nuevos[producto.id] =
            String(producto.stock)
        }
      }

      return nuevos
    })
  }, [api.data?.productos])

  useEffect(() => {
    if (!message) return

    const timer = setTimeout(() => {
      setMessage("")
    }, 2500)

    return () => clearTimeout(timer)
  }, [message])

  const changeValue = (id, value) => {
    setValues((anteriores) => ({
      ...anteriores,
      [id]: value
    }))
  }

  const save = async (product) => {
    if (savingId !== null) return

    const valor = values[product.id]
    const stock = Number(valor)

    if (
      valor === undefined ||
      valor === "" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setMessage("Ingresa un stock válido")
      return
    }

    try {
      setSavingId(product.id)

      await mutateGraphQL(
        M_AJUSTAR_STOCK,
        {
          id: product.id,
          stock
        }
      )

      setMessage(
        `Stock de ${product.nombre} actualizado a ${stock} unidades`
      )

      await api.refresh()

    } catch (err) {
      setMessage(
        err.message ||
        "No se pudo actualizar el stock"
      )
    } finally {
      setSavingId(null)
    }
  }

  if (api.loading && !api.data) {
    return (
      <TableSkeleton
        rows={8}
        columns={6}
        title="Inventario"
      />
    )
  }

  if (api.error && !api.data) {
    return (
      <ErrorBox
        message={api.error}
        retry={api.reload}
      />
    )
  }

  const activos = productos.filter(
    (p) => p.activo
  )

  const stockBajo = activos.filter(
    (p) => p.stock <= 5
  ).length

  return (
    <>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}

      <div className="admin-title">
        <div>
          <span className="eyebrow">
            EXISTENCIAS
          </span>

          <h1>Inventario</h1>
        </div>

        <span>
          {stockBajo} con stock bajo
        </span>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock disponible</th>
                <th>Estado</th>
                <th>Reponer hasta</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {activos.map((product) => {
                const disponible =
                  Number(product.stock)

                const valorReposicion =
                  values[product.id] ?? ""

                return (
                  <tr key={product.id}>

                    <td>
                      <strong>
                        {product.nombre}
                      </strong>
                    </td>

                    <td>
                      {product.categoria?.nombre ||
                        "Sin categoría"}
                    </td>

                    {/* STOCK REAL */}

                    <td>
                      <strong>
                        {disponible}
                      </strong>
                    </td>

                    {/* ESTADO */}

                    <td>
                      <Status
                        value={
                          disponible === 0
                            ? "AGOTADO"
                            : disponible <= 5
                              ? "STOCK_BAJO"
                              : "DISPONIBLE"
                        }
                      />
                    </td>

                    {/* VALOR INDEPENDIENTE */}

                    <td>
                      <input
                        className="table-input"
                        type="number"
                        min="0"
                        step="1"
                        value={valorReposicion}
                        onChange={(e) =>
                          changeValue(
                            product.id,
                            e.target.value
                          )
                        }
                        aria-label={
                          `Nuevo stock de ${product.nombre}`
                        }
                      />
                    </td>

                    <td>
                      <button
                        disabled={
                          savingId !== null
                        }
                        onClick={() =>
                          save(product)
                        }
                      >
                        {savingId === product.id
                          ? "Guardando..."
                          : "Guardar"}
                      </button>
                    </td>

                  </tr>
                )
              })}

              {activos.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    No hay productos activos.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
