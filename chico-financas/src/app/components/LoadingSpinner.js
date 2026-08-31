export default function LoadingSpinner() {
  return (
    <div className="wrap">
      <div className="page-loading">
        <span className="btn-spinner" aria-hidden="true" />
        <span>Carregando…</span>
      </div>
    </div>
  );
}
