export default function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '3rem', color: '#0ea5e9', marginBottom: '1rem' }}></i>
        <h3 style={{ margin: 0, fontWeight: 600 }}>Cargando datos...</h3>
      </div>
    </div>
  );
}