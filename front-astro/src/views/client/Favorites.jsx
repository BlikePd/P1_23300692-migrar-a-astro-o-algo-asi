import { useEffect, useState } from "react"
import ClientShell from "../../components/ClientShell"
import ProductCard from "../../components/ProductCard"
import { Empty, ErrorBox } from "../../components/Ui"
import { ProductGridSkeleton } from "../../components/skeletons"
import { useApi } from "../../lib/useApi"
import { Q_MIS_FAVORITOS, M_ALTERNAR_FAVORITO } from "../../lib/queries"
import { mutateGraphQL } from "../../lib/apollo"
import { useAuthStore } from "../../store/authStore"
import { navigate } from "../../lib/navigate"

function FavoritesContent() {
  const [procesando, setProcesando] = useState(null)
  const [errorFavorito, setErrorFavorito] = useState("")

  const api = useApi(Q_MIS_FAVORITOS, {}, [])

  const quitarFavorito = async (producto) => {
    if (procesando !== null) return

    setProcesando(String(producto.id))
    setErrorFavorito("")

    try {
      await mutateGraphQL(
        M_ALTERNAR_FAVORITO,
        { productoId: producto.id }
      )

      await api.reload()
    } catch (err) {
      setErrorFavorito(
        err.message || "No se pudo quitar el producto."
      )
    } finally {
      setProcesando(null)
    }
  }

  const productos = api.data?.misFavoritos || []

  return (
    <ClientShell navigate={navigate}>
      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              TU COLECCIÓN
            </span>

            <h1>Me gusta</h1>

            <p>
              Aquí encontrarás tus productos favoritos.
            </p>
          </div>

          <button
            type="button"
            className="ghost"
            onClick={() => navigate("/")}
          >
            Explorar catálogo
          </button>
        </div>

        {errorFavorito && (
          <div className="inline-error" role="alert">
            {errorFavorito}
          </div>
        )}

        {api.loading && !api.data && (
          <ProductGridSkeleton count={4} />
        )}

        {api.error && (
          <ErrorBox
            message={api.error}
            retry={api.reload}
          />
        )}

        {!api.loading && !api.error && productos.length === 0 && (
          <Empty>
            Todavía no tienes productos favoritos.
            Explora el catálogo y pulsa el corazón ♡.
          </Empty>
        )}

        {productos.length > 0 && (
          <div className="product-grid">
            {productos.map((producto) => (
              <ProductCard
                key={producto.id}
                product={producto}
                onOpen={(id) =>
                  navigate(`/producto/${id}`)
                }
                onToggleFavorito={quitarFavorito}
                procesandoFavorito={procesando !== null}
              />
            ))}
          </div>
        )}
      </section>
    </ClientShell>
  )
}

export default function Favorites() {
  const usuario = useAuthStore((state) => state.usuario)

  useEffect(() => {
    if (!usuario) {
      navigate("/login")
    }
  }, [usuario])

  if (!usuario) {
    return null
  }

  return <FavoritesContent key={usuario.id} />
}
