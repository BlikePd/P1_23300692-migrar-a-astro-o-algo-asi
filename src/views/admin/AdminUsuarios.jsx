
import { useEffect, useState } from "react"
import { ErrorBox, Status } from "../../components/Ui"
import { mutateGraphQL } from "../../lib/apollo"
import { M_ACTUALIZAR_USUARIO, Q_ADMIN_USUARIOS } from "../../lib/queries"
import { useApi } from "../../lib/useApi"
import { TableSkeleton } from "../../components/skeletons"
import { useBackofficeRefresh } from "../../lib/useBackofficeRefresh"

export default function AdminUsers({ currentAdmin }) {
  const [busqueda, setBusqueda] = useState("")
  const [busquedaAplicada, setBusquedaAplicada] = useState("")
  const [filtroRol, setFiltroRol] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [error, setError] = useState("")
  const [procesando, setProcesando] = useState(null)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim())
    }, 300)

    return () => clearTimeout(temporizador)
  }, [busqueda])

  const api = useApi(
    Q_ADMIN_USUARIOS,
    {
      busqueda: busquedaAplicada || null,
      rol: filtroRol || null,
      activo:
        filtroEstado === "todos"
          ? null
          : filtroEstado === "activos"
    },
    [busquedaAplicada, filtroRol, filtroEstado]
  )

  useBackofficeRefresh(api.reload, ["USUARIO", "PEDIDO"])

  const usuarios = api.data?.usuarios || []

  const limpiarFiltros = () => {
    setBusqueda("")
    setBusquedaAplicada("")
    setFiltroRol("")
    setFiltroEstado("todos")
  }

  const update = async (user, patch) => {
    if (procesando !== null) return

    setProcesando(user.id)
    setError("")

    try {
      await mutateGraphQL(M_ACTUALIZAR_USUARIO, {
        id: user.id,
        ...patch
      })

      await api.reload()
    } catch (err) {
      setError(err.message || "No se pudo actualizar el usuario.")
    } finally {
      setProcesando(null)
    }
  }

  if (api.loading && !api.data) {
    return <TableSkeleton rows={8} columns={6} title="Usuarios" />
  }

  if (api.error && !api.data) {
    return <ErrorBox message={api.error} retry={api.reload} />
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">ACCESO</span>
          <h1>Usuarios</h1>
        </div>
      </div>

      {error && (
        <div className="inline-error standalone">
          {error}
        </div>
      )}

      {api.error && (
        <div className="inline-error standalone">
          {api.error}
        </div>
      )}

      <div className="panel">
        <div
          className="admin-users-filters"
          role="search"
          aria-label="Buscar y filtrar usuarios"
        >
          <label>
            Buscar usuario
            <input
              type="search"
              placeholder="Nombre, correo o ID"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
            />
          </label>

          <label>
            Rol
            <select
              value={filtroRol}
              onChange={(event) =>
                setFiltroRol(event.target.value)
              }
            >
              <option value="">Todos los roles</option>
              <option value="CLIENTE">Clientes</option>
              <option value="ADMIN">Administradores</option>
            </select>
          </label>

          <label>
            Estado
            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(event.target.value)
              }
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </label>

          <button
            type="button"
            className="ghost"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        </div>

        <div
          className="admin-users-results"
          role="status"
          aria-live="polite"
        >
          {usuarios.length}{" "}
          {usuarios.length === 1
            ? "usuario encontrado"
            : "usuarios encontrados"}

          {api.loading && (
            <span> · Actualizando...</span>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Pedidos</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((user) => {
                const esMiCuenta =
                  String(user.id) === String(currentAdmin?.id)

                const bloqueado = procesando !== null

                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.nombre}</strong>
                    </td>

                    <td>{user.email}</td>

                    <td>{user.pedidos.length}</td>

                    <td>
                      <select
                        value={user.rol}
                        onChange={(event) =>
                          update(user, {
                            rol: event.target.value
                          })
                        }
                        disabled={esMiCuenta || bloqueado}
                        aria-label={`Rol de ${user.nombre}`}
                      >
                        <option value="CLIENTE">
                          CLIENTE
                        </option>
                        <option value="ADMIN">
                          ADMIN
                        </option>
                      </select>
                    </td>

                    <td>
                      <Status
                        value={
                          user.activo
                            ? "ACTIVO"
                            : "INACTIVO"
                        }
                      />
                    </td>

                    <td>
                      {!esMiCuenta && (
                        <button
                          type="button"
                          className={
                            user.activo ? "danger" : ""
                          }
                          onClick={() =>
                            update(user, {
                              activo: !user.activo
                            })
                          }
                          disabled={bloqueado}
                        >
                          {user.activo
                            ? "Desactivar"
                            : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}

              {!usuarios.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="admin-users-empty"
                  >
                    No se encontraron usuarios con esos filtros.
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
