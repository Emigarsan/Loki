import { useParams, useNavigate } from 'react-router-dom';
import { EventView } from '../App.jsx';

export default function MesaPage() {
  const { mesaId } = useParams();
  const navigate = useNavigate();

  return (
    <><div className="form" style={{ marginBottom: 12 }}>
      <button onClick={() => navigate('/register')}>Volver</button>
    </div><div className="container">
      <EventView mesaId={mesaId ? Number(mesaId) : null} />
      </div></>
  );
}
