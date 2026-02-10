import { useParams, Link } from 'react-router-dom';

export default function MesaPage() {
    const { mesaId } = useParams();

    return (
        <div className="container overlay-card">
            <h2>Mesa en construccion</h2>
            <p>
                Placeholder para la mesa {mesaId || ''}. Esta pantalla se completara cuando
                se defina el nuevo flujo.
            </p>
            <Link to="/register">Volver a registro</Link>
        </div>
    );
}
