export function FeatureHeading({ title, action, onAction, open }) {
  return (
    <div className="module-heading">
      <h2>{title}</h2>
      {action && <button className="btn" onClick={onAction}>{open ? "Cerrar" : action}</button>}
    </div>
  );
}
