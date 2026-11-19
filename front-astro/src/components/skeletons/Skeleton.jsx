export default function Skeleton({
  className = "",
  width,
  height,
  rounded = false,
  style = {}
}) {
  return (
    <span
      className={`skeleton ${rounded ? "skeleton-rounded" : ""} ${className}`}
      style={{
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...style
      }}
      aria-hidden="true"
    />
  );
}