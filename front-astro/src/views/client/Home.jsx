
import { useEffect, useState } from "react"
import ClientShell from "../../components/ClientShell"
import ProductCard from "../../components/ProductCard"
import { ErrorBox } from "../../components/Ui"
import { ProductGridSkeleton } from "../../components/skeletons"
import { Q_CATALOGO, M_ALTERNAR_FAVORITO } from "../../lib/queries"
import { mutateGraphQL } from "../../lib/apollo"
import { useApi } from "../../lib/useApi"
import { useCatalogoEnVivo } from "../../lib/useCatalogoEnVivo"
import { useAuthStore } from "../../store/authStore"
import { navigate } from "../../lib/navigate"

export default function Home() {
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState(null)
  const [favoritosLocales, setFavoritosLocales] = useState({})
  const [favoritoPendiente, setFavoritoPendiente] = useState(null)
  const [favoritoError, setFavoritoError] = useState("")

  const usuario = useAuthStore((state) => state.usuario)

  const {
    data,
    loading,
    error,
    reload,
    refresh
  } = useApi(
    Q_CATALOGO,
    {
      busqueda: search || null,
      categoriaId: categoryId
    },
    [search, categoryId, usuario?.id]
  )

  useCatalogoEnVivo(refresh)

  useEffect(() => {
    setFavoritosLocales({})
    setFavoritoError("")
  }, [usuario?.id])

  const categories = data?.categorias || []
  const products = data?.productos || []

  const obtenerEstadoFavorito = (producto) => {
    const id = String(producto.id)

    if (
      Object.prototype.hasOwnProperty.call(
        favoritosLocales,
        id
      )
    ) {
      return favoritosLocales[id]
    }

    return Boolean(producto.esFavorito)
  }

  const alternarFavorito = async (producto) => {
    if (!usuario) {
      navigate("/login")
      return
    }

    if (favoritoPendiente !== null) {
      return
    }

    if (!producto || !producto.activo) {
      setFavoritoError(
        "Este producto no está disponible."
      )
      return
    }

    const id = String(producto.id)
    const estadoAnterior = obtenerEstadoFavorito(producto)
    const nuevoEstado = !estadoAnterior

    setFavoritoPendiente(id)
    setFavoritoError("")

    setFavoritosLocales((actuales) => ({
      ...actuales,
      [id]: nuevoEstado
    }))

    try {
      const resultado = await mutateGraphQL(
        M_ALTERNAR_FAVORITO,
        {
          productoId: producto.id
        }
      )

      if (
        typeof resultado?.alternarFavorito !== "boolean"
      ) {
        throw new Error(
          "No se pudo confirmar el estado del favorito."
        )
      }

      setFavoritosLocales((actuales) => ({
        ...actuales,
        [id]: resultado.alternarFavorito
      }))
    } catch (err) {
      console.error(
        "Error al actualizar favorito:",
        err
      )

      setFavoritosLocales((actuales) => ({
        ...actuales,
        [id]: estadoAnterior
      }))

      setFavoritoError(
        err.message ||
        "No se pudo actualizar el producto favorito."
      )
    } finally {
      setFavoritoPendiente(null)
    }
  }

  const seleccionarCategoria = (id) => {
    setCategoryId(id)
    setFavoritoError("")
  }

  const cambiarBusqueda = (valor) => {
    setSearch(valor)
    setFavoritoError("")
  }

  return (
    <ClientShell
      navigate={navigate}
      categories={categories}
      onCategory={seleccionarCategoria}
      search={search}
      setSearch={cambiarBusqueda}
    >
      <section className="hero">
        <div>
          <span className="eyebrow">
            QUEST MERCHANT
          </span>

          <h1>Equipa la próxima aventura.</h1>

          <p>
            Manuales, dados, accesorios y miniaturas
            para jugadores y Dungeon Masters.
          </p>
        </div>

        <div className="hero-rune">D20</div>
      </section>

      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              CATÁLOGO
            </span>

            <h2>
              {categoryId
                ? categories.find(
                    (item) =>
                      String(item.id) === String(categoryId)
                  )?.nombre || "Productos"
                : "Todos los productos"}
            </h2>
          </div>

          {!loading && !error && (
            <span>
              {products.length} resultados
            </span>
          )}
        </div>

        <div
          className="catalog-categories"
          aria-label="Categorías de productos"
        >
          <button
            type="button"
            className={
              categoryId === null
                ? "category-chip active"
                : "category-chip"
            }
            onClick={() => seleccionarCategoria(null)}
            aria-pressed={categoryId === null}
          >
            Todos
          </button>

          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={
                String(categoryId) === String(category.id)
                  ? "category-chip active"
                  : "category-chip"
              }
              onClick={() =>
                seleccionarCategoria(category.id)
              }
              aria-pressed={
                String(categoryId) === String(category.id)
              }
            >
              {category.nombre}
            </button>
          ))}
        </div>

        {favoritoError && (
          <div
            className="inline-error"
            role="alert"
          >
            {favoritoError}
          </div>
        )}

        {loading && (
          <ProductGridSkeleton count={8} />
        )}

        {error && (
          <ErrorBox
            message={error}
            retry={reload}
          />
        )}

        {!loading && !error && (
          <div className="product-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index === 0}
                onOpen={(id) => navigate(`/producto/${id}`)}
              />
            ))}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="empty-state">
            <h3>No encontramos productos</h3>
            <p>
              Intenta cambiar la búsqueda o
              seleccionar otra categoría.
            </p>
          </div>
        )}
      </section>
    </ClientShell>
  )
}
