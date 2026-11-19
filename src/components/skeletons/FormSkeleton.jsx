import Skeleton from "./Skeleton";

export default function FormSkeleton({
  fields = 5,
  columns = 1,
  showButton = true,
  title = ""
}) {
  return (
    <div
      className="form-card skeleton-form"
      role="status"
      aria-label="Cargando formulario"
      aria-busy="true"
    >
      {title && (
        <div className="panel-head">
          <h2>{title}</h2>
        </div>
      )}

      <div
        className={
          columns === 2
            ? "skeleton-form-grid two-columns"
            : "skeleton-form-grid"
        }
      >
        {Array.from({ length: fields }, (_, index) => (
          <div
            className="skeleton-form-group"
            key={index}
          >
            <Skeleton
              height={11}
              width="35%"
            />

            <Skeleton
              className="skeleton-field"
            />
          </div>
        ))}
      </div>

      {showButton && (
        <div className="skeleton-form-actions">
          <Skeleton
            className="skeleton-button"
            width={145}
            height={42}
          />
        </div>
      )}
    </div>
  );
}