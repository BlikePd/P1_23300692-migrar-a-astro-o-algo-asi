import { TiltCard } from "@/components/motion/tilt-card"

export default function ProductCard({
  product,
  onOpen,
  onToggleFavorito,
  procesandoFavorito = false
}) {
  return (
    <TiltCard
      max={8}
      glare
      className="product-tilt"
    >
      <article className="product-card">
        <button
          type="button"
          className="product-card-open"
          aria-label={`Ver detalles de ${product.nombre}`}
          onClick={() => onOpen(product.id)}
        />

        {onToggleFavorito && (
          <button
            type="button"
            className={`favorite-button ${
              product.esFavorito ? "is-favorite" : ""
            }`}
            onClick={() => onToggleFavorito(product)}
            disabled={procesandoFavorito}
            aria-pressed={Boolean(product.esFavorito)}
            aria-label={
              product.esFavorito
                ? `Quitar ${product.nombre} de favoritos`
                : `Agregar ${product.nombre} a favoritos`
            }
            title={
              product.esFavorito
                ? "Quitar de Me gusta"
                : "Agregar a Me gusta"
            }
          >
            {product.esFavorito ? "♥" : "♡"}
          </button>
        )}

        <img
          src={product.imagen || "/images/dados-arcanos.jpg"}
          alt={product.nombre}
        />

        <div className="product-meta">
          <span className="pill">
            {product.categoria?.nombre || "Producto"}
          </span>

          <span className={product.stock <= 5 ? "stock low" : "stock"}>
            Stock {product.stock}
          </span>
        </div>

        <h3>{product.nombre}</h3>

        <p>
          {product.descripcion || "Producto de Quest Merchant"}
        </p>

        <div className="product-footer">
          <strong>
            ${Number(product.precio).toLocaleString("es-MX")}
          </strong>
        </div>
      </article>
    </TiltCard>
  )
}
