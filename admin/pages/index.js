import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setIsAuthenticated(true);
    localStorage.setItem('admin_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('admin_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

