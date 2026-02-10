import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import RegisterPage from './pages/Register.jsx';
import AdminPage from './pages/Admin.jsx';
import MesaPage from './pages/Mesa.jsx';
import DisplayPage from './pages/Display.jsx';

function PageWrapper({ children }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const classNames = ['page'];
  if (isAdmin) {
    classNames.push('page-wide');
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
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/mesa/:mesaId" element={<MesaPage />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </PageWrapper>
    </BrowserRouter>
  );
}
