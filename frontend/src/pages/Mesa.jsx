import { useParams, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { EventView } from '../App.jsx';

export default function MesaPage() {
  const { mesaId } = useParams();
  const navigate = useNavigate();

  const logMesaEvent = useCallback(async ({ contador, delta }) => {
    const payload = { delta, uuid: crypto.randomUUID(), ts: Date.now() };
    try {
      await fetch(`/api/mesas/${mesaId}/contador/${contador}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (_) { }
  }, [mesaId]);

  return (
    <><div className="form" style={{ marginBottom: 12 }}>
      <button onClick={() => navigate('/register')}>Volver</button>
    </div><div className="container overlay-card">
        <h3>Mesa {mesaId}</h3>
        <EventView onAction={logMesaEvent} />
      </div></>
  );
}
