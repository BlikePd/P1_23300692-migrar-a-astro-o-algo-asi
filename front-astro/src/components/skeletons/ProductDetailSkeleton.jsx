import Skeleton from "./Skeleton";

export default function ProductDetailSkeleton() {
  return (
    <div
      className="detail-grid"
      role="status"
      aria-label="Cargando detalles del producto"
      aria-busy="true"
    >
      <div className="detail-image-wrap">
        <Skeleton
          className="skeleton-detail-image"
        />
      </div>

      <div className="detail-info skeleton-detail-info">
        <Skeleton height={12} width="28%" />

        <Skeleton height={34} width="85%" />

        <div className="skeleton-stack">
          <Skeleton height={12} width="100%" />
          <Skeleton height={12} width="94%" />
          <Skeleton height={12} width="70%" />
        </div>

        <Skeleton height={31} width="36%" />

        <div className="skeleton-stack">
          <Skeleton height={12} width="24%" />
          <Skeleton
            className="skeleton-field"
            width={125}
          />
        </div>

        <Skeleton
          className="skeleton-field"
          width="65%"
        />
      </div>
    </div>
  );
}