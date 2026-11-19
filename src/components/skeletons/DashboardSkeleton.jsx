import Skeleton from "./Skeleton";
import TableSkeleton from "./TableSkeleton";

export default function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando dashboard"
      aria-busy="true"
    >
      <div className="admin-title">
        <div>
          <span className="eyebrow">RESUMEN</span>
          <h1>Dashboard</h1>
        </div>
      </div>

      <div className="metric-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            className="skeleton-metric"
            key={index}
            aria-hidden="true"
          >
            <Skeleton
              width="65%"
              height={13}
            />

            <Skeleton
              width="48%"
              height={29}
            />
          </div>
        ))}
      </div>

      <div className="panel skeleton-dashboard-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">ACTIVIDAD</span>
            <h2>Últimos pedidos</h2>
          </div>
        </div>

        <TableSkeleton
          rows={6}
          columns={5}
          showHeader={true}
        />
      </div>

      <div className="integration-strip">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="skeleton-integration"
            key={index}
            aria-hidden="true"
          >
            <Skeleton width="35%" height={16} />
            <Skeleton width="85%" height={12} />
            <Skeleton width="55%" height={10} />
          </div>
        ))}
      </div>
    </div>
  );
}