import Skeleton from "./Skeleton";

export default function TableSkeleton({
  rows = 6,
  columns = 5,
  title = "",
  showHeader = true
}) {
  const columnCount = Math.max(1, columns);
  const rowCount = Math.max(0, rows);

  return (
    <div
      className="skeleton-table"
      role="status"
      aria-label="Cargando información de la tabla"
      aria-busy="true"
    >
      {title && (
        <div className="panel-head">
          <h2>{title}</h2>
        </div>
      )}

      <div className="skeleton-table-scroll">
        <div
          className="skeleton-table-grid"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(110px, 1fr))`
          }}
        >
          {showHeader &&
            Array.from(
              { length: columnCount },
              (_, index) => (
                <div
                  className="skeleton-table-heading"
                  key={`head-${index}`}
                >
                  <Skeleton
                    height={12}
                    width="65%"
                  />
                </div>
              )
            )}

          {Array.from({ length: rowCount }, (_, row) =>
            Array.from(
              { length: columnCount },
              (_, col) => (
                <div
                  className="skeleton-table-cell"
                  key={`${row}-${col}`}
                >
                  <Skeleton
                    height={12}
                    width={
                      col === 0
                        ? "55%"
                        : col === columnCount - 1
                        ? "75%"
                        : "85%"
                    }
                  />
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}