import { Link } from 'react-router-dom';

export default function DisplayPage() {
    return (
        <div className="container overlay-card">
            <h2>Display en construccion</h2>
            <p>Placeholder para la pantalla de display. Se definira en la nueva version.</p>
            <Link to="/register">Volver a registro</Link>
        </div>
    );
}
