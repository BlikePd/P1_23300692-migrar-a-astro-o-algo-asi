import { useRef, useState } from "react"
import { ErrorBox, Status } from "../../components/Ui"
import { mutateGraphQL } from "../../lib/apollo"
import {
  M_ACTUALIZAR_PRODUCTO,
  M_CREAR_PRODUCTO,
  M_ELIMINAR_PRODUCTO,
  Q_ADMIN_PRODUCTOS
} from "../../lib/queries"
import { useApi } from "../../lib/useApi"
import { TableSkeleton } from "../../components/skeletons"
import { useAuthStore } from "../../store/authStore"
import { useBackofficeRefresh } from "../../lib/useBackofficeRefresh"

const blank = {
  nombre: "",
  descripcion: "",
  precio: "",
  imagen: "",
  stock: "",
  categoriaId: "",
  categoriaIds: [],
  activo: true
}

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp"
]

const MAX_IMAGEN = 5 * 1024 * 1024

const obtenerCategoriasProducto = (producto) => {
  if (producto.categorias?.length) {
    return producto.categorias
  }

  return producto.categoria
    ? [producto.categoria]
    : []
}

export default function AdminProducts() {
  const api = useApi(Q_ADMIN_PRODUCTOS, {}, [])

  useBackofficeRefresh(api.refresh, [
    "PRODUCTO",
    "CATEGORIA"
  ])

  const [form, setForm] = useState({
    ...blank,
    categoriaIds: []
  })

  const [editing, setEditing] = useState(null)
  const [error, setError] = useState("")
  const [archivoImagen, setArchivoImagen] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [busqueda, setBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroStock, setFiltroStock] = useState("todos")

  const inputImagenRef = useRef(null)

  const productos = api.data?.productos || []
  const categorias = api.data?.categorias || []

  const productosFiltrados = productos.filter((producto) => {
    const consulta = busqueda.trim().toLocaleLowerCase("es-MX")

    const contenido = `
      ${producto.id}
      ${producto.nombre || ""}
      ${producto.descripcion || ""}
    `.toLocaleLowerCase("es-MX")

    const stock = Number(producto.stock)

    if (consulta && !contenido.includes(consulta)) {
      return false
    }

    if (filtroCategoria) {
      const categoriasProducto = obtenerCategoriasProducto(producto)

      const pertenece = categoriasProducto.some(
        (categoria) =>
          String(categoria.id) === String(filtroCategoria)
      )

      if (!pertenece) {
        return false
      }
    }

    if (filtroEstado === "activos" && !producto.activo) {
      return false
    }

    if (filtroEstado === "inactivos" && producto.activo) {
      return false
    }

    if (filtroStock === "disponibles" && stock <= 0) {
      return false
    }

    if (filtroStock === "bajo" && (stock <= 0 || stock > 5)) {
      return false
    }

    if (filtroStock === "agotados" && stock !== 0) {
      return false
    }

    return true
  })

  const limpiarFiltros = () => {
    setBusqueda("")
    setFiltroCategoria("")
    setFiltroEstado("todos")
    setFiltroStock("todos")
  }

  const obtenerApiUrl = () => {
    const url =
      import.meta.env.PUBLIC_GRAPHQL_URL?.trim() ||
      (import.meta.env.DEV
        ? "http://localhost:4000/"
        : "")

    if (!url) {
      throw new Error(
        "Falta configurar PUBLIC_GRAPHQL_URL"
      )
    }

    return url
  }

  const seleccionarImagen = (event) => {
    const archivo = event.target.files?.[0] || null

    setError("")

    if (!archivo) {
      setArchivoImagen(null)
      return
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setError(
        "Solo se permiten imágenes JPG, PNG o WebP."
      )

      setArchivoImagen(null)
      event.target.value = ""
      return
    }

    if (archivo.size > MAX_IMAGEN) {
      setError(
        "La imagen no puede superar los 5 MB."
      )

      setArchivoImagen(null)
      event.target.value = ""
      return
    }

    setArchivoImagen(archivo)
  }

  const cambiarCategoriaPrincipal = (categoriaId) => {
    const id = String(categoriaId)

    setForm((actual) => ({
      ...actual,
      categoriaId: id,
      categoriaIds:
        id && !actual.categoriaIds.includes(id)
          ? [...actual.categoriaIds, id]
          : actual.categoriaIds
    }))
  }

  const cambiarCategoriaAdicional = (categoriaId, seleccionada) => {
    const id = String(categoriaId)

    setForm((actual) => {
      if (
        !seleccionada &&
        id === String(actual.categoriaId)
      ) {
        return actual
      }

      return {
        ...actual,
        categoriaIds: seleccionada
          ? [...new Set([...actual.categoriaIds, id])]
          : actual.categoriaIds.filter(
              (actualId) => actualId !== id
            )
      }
    })
  }

  const edit = (product) => {
    setError("")
    setArchivoImagen(null)
    setEditing(product.id)

    if (inputImagenRef.current) {
      inputImagenRef.current.value = ""
    }

    const principal = String(product.categoria?.id || "")

    const categoriasActuales = obtenerCategoriasProducto(product)
      .map((categoria) => String(categoria.id))

    if (principal && !categoriasActuales.includes(principal)) {
      categoriasActuales.unshift(principal)
    }

    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion || "",
      precio: String(product.precio),
      imagen: product.imagen || "",
      stock: String(product.stock),
      categoriaId: principal,
      categoriaIds: [...new Set(categoriasActuales)],
      activo: product.activo
    })
  }

  const reset = () => {
    setArchivoImagen(null)
    setEditing(null)

    setForm({
      ...blank,
      categoriaIds: []
    })

    setError("")

    if (inputImagenRef.current) {
      inputImagenRef.current.value = ""
    }
  }

  const subirImagen = async (archivoImagen) => {
    const apiUrl = obtenerApiUrl()
    const token = useAuthStore.getState().token

    if (!token) {
      throw new Error(
        "Debes iniciar sesión para subir imágenes."
      )
    }

    const archivo = new FormData()
    archivo.append("imagen", archivoImagen)

    const respuesta = await fetch(
      new URL("/uploads", apiUrl).href,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: archivo
      }
    )

    const resultado = await respuesta
      .json()
      .catch(() => ({}))

    if (!respuesta.ok) {
      if (respuesta.status === 401) {
        useAuthStore.getState().logout()

        throw new Error(
          "Tu sesión expiró. Inicia sesión nuevamente."
        )
      }

      if (respuesta.status === 403) {
        throw new Error(
          "No tienes permisos para subir imágenes."
        )
      }

      if (respuesta.status === 413) {
        throw new Error(
          "La imagen supera el tamaño permitido."
        )
      }

      throw new Error(
        resultado.mensaje ||
        `Error al subir imagen (${respuesta.status})`
      )
    }

    if (
      typeof resultado.imagen !== "string" ||
      !resultado.imagen.startsWith("https://")
    ) {
      throw new Error(
        "El backend no devolvió una URL HTTPS válida. " +
        "Verifica la integración de Cloudinary."
      )
    }

    let urlImagen

    try {
      urlImagen = new URL(resultado.imagen)

      if (urlImagen.protocol !== "https:") {
        throw new Error("Protocolo inválido")
      }
    } catch {
      throw new Error(
        "La URL de la imagen devuelta por el servidor es inválida."
      )
    }

    return urlImagen.href
  }

  const submit = async (event) => {
    event.preventDefault()

    if (guardando) return

    setGuardando(true)
    setError("")

    try {
      const categoriaPrincipal = String(form.categoriaId)

      const categoriasSeleccionadas = [
        ...new Set(form.categoriaIds.map(String))
      ]

      if (!categoriaPrincipal) {
        throw new Error(
          "Selecciona una categoría principal."
        )
      }

      if (!categoriasSeleccionadas.length) {
        throw new Error(
          "Selecciona al menos una categoría."
        )
      }

      if (!categoriasSeleccionadas.includes(categoriaPrincipal)) {
        throw new Error(
          "La categoría principal debe estar seleccionada."
        )
      }

      const precio = Number(form.precio)
      const stock = Number(form.stock)

      if (!Number.isFinite(precio) || precio < 0) {
        throw new Error(
          "Ingresa un precio válido."
        )
      }

      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error(
          "El stock debe ser un número entero positivo o cero."
        )
      }

      const datos = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precio,
        imagen: form.imagen || null,
        stock,
        categoriaId: categoriaPrincipal,
        categoriaIds: categoriasSeleccionadas,
        activo: form.activo
      }

      if (archivoImagen) {
        const urlImagen = await subirImagen(archivoImagen)
        datos.imagen = urlImagen
      }

      if (editing !== null) {
        await mutateGraphQL(
          M_ACTUALIZAR_PRODUCTO,
          {
            id: editing,
            datos
          }
        )
      } else {
        await mutateGraphQL(
          M_CREAR_PRODUCTO,
          {
            datos
          }
        )
      }

      reset()
      await api.reload()
    } catch (err) {
      console.error(
        "Error al guardar producto:",
        err
      )

      setError(
        err.message ||
        "Ocurrió un error al guardar el producto."
      )
    } finally {
      setGuardando(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm("¿Desactivar este producto?")) {
      return
    }

    setError("")

    try {
      await mutateGraphQL(
        M_ELIMINAR_PRODUCTO,
        { id }
      )

      await api.reload()
    } catch (err) {
      setError(
        err.message ||
        "No se pudo desactivar el producto."
      )
    }
  }

  if (api.loading && !api.data) {
    return (
      <TableSkeleton
        rows={8}
        columns={6}
        title="Productos"
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

  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Productos</h1>
        </div>
      </div>

      <div className="admin-two-col">
        <div className="panel">
          <div className="panel-head">
            <h2>
              {editing
                ? "Editar producto"
                : "Nuevo producto"}
            </h2>
          </div>

          <form
            className="compact-form"
            onSubmit={submit}
          >
            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    nombre: e.target.value
                  }))
                }
                disabled={guardando}
                required
              />
            </label>

            <label>
              Descripción
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    descripcion: e.target.value
                  }))
                }
                disabled={guardando}
              />
            </label>

            <div className="form-grid">
              <label>
                Precio
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      precio: e.target.value
                    }))
                  }
                  disabled={guardando}
                  required
                />
              </label>

              <label>
                Stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      stock: e.target.value
                    }))
                  }
                  disabled={guardando}
                  required
                />
              </label>
            </div>

            <label>
              Seleccionar imagen
              <input
                ref={inputImagenRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={seleccionarImagen}
                disabled={guardando}
              />
            </label>

            {archivoImagen && (
              <span>
                Imagen seleccionada: {archivoImagen.name}
              </span>
            )}

            {editing && form.imagen && !archivoImagen && (
              <div>
                <span>Imagen actual:</span>
                <div style={{ marginTop: "8px" }}>
                  <img
                    src={form.imagen}
                    alt="Imagen actual del producto"
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "10px"
                    }}
                  />
                </div>
              </div>
            )}

            <label>
              Categoría principal
              <select
                value={form.categoriaId}
                onChange={(e) =>
                  cambiarCategoriaPrincipal(e.target.value)
                }
                disabled={guardando}
                required
              >
                <option value="">
                  Selecciona
                </option>

                {categorias.map((categoria) => (
                  <option
                    key={categoria.id}
                    value={categoria.id}
                  >
                    {categoria.nombre}
                    {!categoria.activo ? " (inactiva)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="product-category-fieldset">
              <legend>Categorías del producto</legend>

              <p className="product-category-hint">
                Selecciona las categorías a las que pertenece
                el producto. La categoría principal permanecerá
                marcada automáticamente.
              </p>

              <div className="product-category-options">
                {categorias.map((categoria) => {
                  const id = String(categoria.id)

                  const esPrincipal =
                    id === String(form.categoriaId)

                  const seleccionada =
                    form.categoriaIds.includes(id)

                  return (
                    <label
                      className="product-category-option"
                      key={id}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        disabled={
                          guardando ||
                          esPrincipal ||
                          (!categoria.activo && !seleccionada)
                        }
                        onChange={(event) =>
                          cambiarCategoriaAdicional(
                            id,
                            event.target.checked
                          )
                        }
                      />

                      <span>
                        {categoria.nombre}

                        {esPrincipal && (
                          <small> (principal)</small>
                        )}

                        {!categoria.activo && (
                          <small> (inactiva)</small>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    activo: e.target.checked
                  }))
                }
                disabled={guardando}
              />
              Activo
            </label>

            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}

            <div className="button-row">
              <button
                type="submit"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : editing
                    ? "Guardar cambios"
                    : "Crear producto"}
              </button>

              {editing && (
                <button
                  type="button"
                  className="ghost"
                  onClick={reset}
                  disabled={guardando}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="panel grow">
          <div className="panel-head">
            <h2>Catálogo completo</h2>

            <span>
              {productosFiltrados.length} de {productos.length} productos
            </span>
          </div>

          <div className="admin-filters">
            <label className="admin-filter-search">
              Buscar producto
              <input
                type="search"
                placeholder="Nombre, descripción o ID"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>

            <label>
              Categoría
              <select
                value={filtroCategoria}
                onChange={(e) =>
                  setFiltroCategoria(e.target.value)
                }
              >
                <option value="">
                  Todas las categorías
                </option>

                {categorias.map((categoria) => (
                  <option
                    key={categoria.id}
                    value={categoria.id}
                  >
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Estado
              <select
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(e.target.value)
                }
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </label>

            <label>
              Inventario
              <select
                value={filtroStock}
                onChange={(e) =>
                  setFiltroStock(e.target.value)
                }
              >
                <option value="todos">
                  Todo el inventario
                </option>
                <option value="disponibles">
                  Con existencias
                </option>
                <option value="bajo">
                  Stock bajo (1 a 5)
                </option>
                <option value="agotados">
                  Agotados
                </option>
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

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categorías</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {productosFiltrados.map((product) => {
                  const categoriasProducto =
                    obtenerCategoriasProducto(product)

                  return (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.nombre}</strong>
                      </td>

                      <td>
                        {categoriasProducto.length ? (
                          <div className="product-category-badges">
                            {categoriasProducto.map((categoria) => (
                              <span
                                className="pill"
                                key={categoria.id}
                              >
                                {categoria.nombre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "Sin categoría"
                        )}
                      </td>

                      <td>
                        ${Number(product.precio).toLocaleString("es-MX")}
                      </td>

                      <td>{product.stock}</td>

                      <td>
                        <Status
                          value={
                            product.activo
                              ? "ACTIVO"
                              : "INACTIVO"
                          }
                        />
                      </td>

                      <td className="table-actions">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => edit(product)}
                          disabled={guardando}
                        >
                          Editar
                        </button>

                        {product.activo && (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => remove(product.id)}
                            disabled={guardando}
                          >
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {productosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="admin-filter-empty"
                    >
                      No se encontraron productos con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
