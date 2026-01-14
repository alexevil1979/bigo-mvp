import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Logout() {
  const { logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
    // Используем window.location для полной перезагрузки страницы
    // Это гарантирует, что все состояние будет сброшено
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  }, [isAuthenticated, logout]);

  return (
    <div className="container">
      <div className="loading">Выход из системы...</div>
    </div>
  );
}

