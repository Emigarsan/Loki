import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import RegisterPage from './pages/Register.jsx';
import FreeGamePage from './pages/FreeGame.jsx';
import FreeGameMesa from './pages/FreeGameMesa.jsx';
import FreeGameTablePage from './pages/FreeGameTable.jsx';
import DisplayPage from './pages/Display.jsx';
import QrDisplayPage from './pages/QrDisplay.jsx';
import ChallengesDisplay from './pages/ChallengesDisplay.jsx';
import AdminPage from './pages/Admin.jsx';
import MesaPage from './pages/Mesa.jsx';

function PageWrapper({ children }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isDisplay = location.pathname.startsWith('/display');
  const classNames = ['page'];
  if (isAdmin || isDisplay) {
    classNames.push('page-wide');
  }
  if (isDisplay) {
    classNames.push('page-display');
  }
  return (
    <div className={classNames.join(' ')}>
      {children}
    </div>
  );
}

function SiteHeader() {
  return (
    <header>
      <h1>InevitableCON 2025 Sevilla</h1>
    </header>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <PageWrapper>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/freegame/:mesaId" element={<FreeGameMesa />} />
          <Route path="/freegame" element={<FreeGamePage />} />
          <Route path="/freegame/:id" element={<FreeGameTablePage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/display/qr" element={<QrDisplayPage />} />
          <Route path="/display/challenges" element={<ChallengesDisplay />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/mesa/:mesaId" element={<MesaPage />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </PageWrapper>
    </BrowserRouter>
  );
}
