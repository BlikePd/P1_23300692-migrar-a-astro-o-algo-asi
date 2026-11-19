import Skeleton from "./Skeleton";

export function OrderSkeleton({
  variant = "client"
}) {
  const isAdmin = variant === "admin";

  return (
    <article
      className={
        isAdmin
          ? "admin-order-card skeleton-order"
          : "order-card skeleton-order"
      }
      aria-hidden="true"
    >
      <div className="order-head">
        <div className="skeleton-stack">
          <Skeleton width={105} height={11} />
          <Skeleton width={165} height={20} />
        </div>

        <Skeleton
          width={85}
          height={26}
          rounded
        />
      </div>

      <div className="skeleton-order-details">
        <Skeleton height={11} width="45%" />
        <Skeleton height={11} width="70%" />
      </div>

      <div className="skeleton-order-items">
        {[1, 2].map((item) => (
          <div
            className="skeleton-order-item"
            key={item}
          >
            <Skeleton width="65%" height={13} />
            <Skeleton width={65} height={13} />
          </div>
        ))}
      </div>

      <div className="skeleton-footer">
        <Skeleton width={105} height={23} />

        <Skeleton
          className="skeleton-button"
          width={isAdmin ? 150 : 95}
        />
      </div>
    </article>
  );
}

export function OrderListSkeleton({
  count = 4,
  variant = "client"
}) {
  return (
    <div
      className={
        variant === "admin"
          ? "order-admin-grid"
          : "order-list"
      }
      role="status"
      aria-label="Cargando pedidos"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <OrderSkeleton
          key={index}
          variant={variant}
        />
      ))}
    </div>
  );
}