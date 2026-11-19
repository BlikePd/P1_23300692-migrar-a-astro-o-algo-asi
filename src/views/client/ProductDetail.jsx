
import { useEffect, useState } from "react"
import ClientShell from "../../components/ClientShell"
import { ErrorBox } from "../../components/Ui"
import { ProductDetailSkeleton } from "../../components/skeletons"
import { useCartStore } from "../../store/cartStore"
import { useAuthStore } from "../../store/authStore"
import { Q_CATEGORIAS, Q_PRODUCTO } from "../../lib/queries"
import { useApi } from "../../lib/useApi"
import { useCatalogoEnVivo } from "../../lib/useCatalogoEnVivo"
import { navigate } from "../../lib/navigate"

export default function ProductDetail({ id }) {
  const [quantity, setQuantity] = useState(1)
  const [toast, setToast] = useState("")

  const add = useCartStore((state) => state.add)
  const usuario = useAuthStore((state) => state.usuario)

  const productQuery = useApi(
    Q_PRODUCTO,
    { id },
    [id]
  )

  const categoryQuery = useApi(
    Q_CATEGORIAS,
    {},
    []
  )

  const product = productQuery.data?.producto

  const categoriasProducto =
    Array.isArray(product?.categorias) &&
    product.categorias.length > 0
      ? product.categorias
      : product?.categoria
        ? [product.categoria]
        : []

  const stock = Number(product?.stock) || 0

  const disponible =
    Boolean(product?.activo) &&
    stock > 0

  useCatalogoEnVivo(() => {
    console.info(
      "[ProductDetail] Actualizando producto:",
      id
    )

    productQuery.refresh()
    categoryQuery.refresh()
  })

  useEffect(() => {
    setQuantity(1)
  }, [id])

  useEffect(() => {
    if (!product) return

    setQuantity((actual) => {
      const maximo = Math.max(1, stock)

      return Math.min(
        Math.max(1, actual),
        maximo
      )
    })
  }, [stock, Boolean(product)])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast("")
    }, 1600)

    return () => clearTimeout(timer)
  }, [toast])

  const addToCart = () => {
    if (!product || !disponible) return

    if (!usuario) {
      navigate("/login")
      return
    }

    const cantidad = Math.min(
      quantity,
      stock
    )

    if (cantidad < 1) return

    add(
      usuario.id,
      product,
      cantidad
    )

    setToast("Agregado al carrito")
  }

  return (
    <ClientShell
      navigate={navigate}
      categories={
        categoryQuery.data?.categorias || []
      }
      onCategory={() => navigate("/")}
    >
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {productQuery.loading &&
        !productQuery.data && (
          <ProductDetailSkeleton />
        )}

      {productQuery.error &&
        !productQuery.data && (
          <ErrorBox
            message={productQuery.error}
            retry={productQuery.reload}
          />
        )}

      {!productQuery.loading &&
        !productQuery.error &&
        !product?.activo && (
          <div className="detail-info">
            <h1>Producto no disponible</h1>

            <p>
              Este producto fue retirado del
              catálogo o ya no está disponible.
            </p>

            <button
              type="button"
              className="ghost"
              onClick={() => navigate("/")}
            >
              Volver al catálogo
            </button>
          </div>
        )}

      {product?.activo && (
        <div className="detail-grid">
          <div className="detail-image-wrap">
            <img
              className="detail-image"
              src={product.imagen || "/images/dados-arcanos.jpg"}
              alt={product.nombre}
              width={800}
              height={600}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>

          <div className="detail-info">
            <div className="product-category-badges">
              {categoriasProducto.length > 0 ? (
                categoriasProducto.map((categoria) => (
                  <span
                    className="pill"
                    key={categoria.id}
                  >
                    {categoria.nombre}
                  </span>
                ))
              ) : (
                <span className="pill">
                  Sin categoría
                </span>
              )}
            </div>

            <h1>{product.nombre}</h1>

            <p>{product.descripcion}</p>

            <strong className="detail-price">
              $
              {Number(
                product.precio
              ).toLocaleString("es-MX")}
            </strong>

            <span
              className={
                stock <= 5
                  ? "stock low"
                  : "stock"
              }
            >
              {stock > 0
                ? `${stock} disponibles`
                : "Agotado"}
            </span>

            <div className="quantity-row">
              <button
                type="button"
                className="ghost"
                disabled={!disponible}
                onClick={() =>
                  setQuantity((q) =>
                    Math.max(1, q - 1)
                  )
                }
                aria-label="Disminuir cantidad"
              >
                −
              </button>

              <strong>{quantity}</strong>

              <button
                type="button"
                className="ghost"
                disabled={!disponible}
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(stock, q + 1)
                  )
                }
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>

            <div className="button-row">
              <button
                type="button"
                onClick={addToCart}
                disabled={!disponible}
              >
                {disponible
                  ? "Agregar al carrito"
                  : "Sin existencias"}
              </button>

              <button
                type="button"
                className="ghost"
                onClick={() => navigate("/")}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientShell>
  )
}

