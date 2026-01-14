import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.API_URL || 'http://localhost:5000'}/api/auth/register`,
        formData
      );

      if (response.data.token) {
        login(response.data.token, response.data.user);
        router.push('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-form">
        <h2>Регистрация</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="nickname"
            placeholder="Никнейм"
            value={formData.nickname}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={20}
          />
          <input
            type="password"
            name="password"
            placeholder="Пароль (минимум 6 символов)"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p>
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}

