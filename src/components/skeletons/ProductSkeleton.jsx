import Skeleton from "./Skeleton";

export function ProductSkeleton() {
  return (
    <article className="skeleton-product" aria-hidden="true">
      <Skeleton className="skeleton-image" />

      <div className="skeleton-content">
        <Skeleton
          className="skeleton-title"
          width="75%"
        />

        <Skeleton
          className="skeleton-line"
          width="96%"
        />

        <Skeleton
          className="skeleton-line"
          width="58%"
        />

        <div className="skeleton-footer">
          <Skeleton
            className="skeleton-price"
            width="38%"
          />

          <Skeleton
            className="skeleton-button"
            width={85}
          />
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div
      className="product-grid"
      role="status"
      aria-label="Cargando productos"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <ProductSkeleton key={index} />
      ))}
    </div>
  );
}