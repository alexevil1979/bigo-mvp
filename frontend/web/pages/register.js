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
    confirmPassword: '',
    nickname: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Необходимо согласиться с условиями использования');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`,
        registerData
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

  const handleOAuthLogin = (provider) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/oauth/${provider}`;
  };

  return (
    <div className="bigo-register-page">
      <div className="register-container">
        <h2>Регистрация</h2>

        <div className="social-login-section">
          <div className="social-buttons">
            <button 
              onClick={() => handleOAuthLogin('facebook')} 
              className="social-button facebook"
              title="Зарегистрироваться через Facebook"
            >
              <span className="social-icon">f</span>
            </button>
            <button 
              onClick={() => handleOAuthLogin('google')} 
              className="social-button google"
              title="Зарегистрироваться через Google"
            >
              <span className="social-icon">G</span>
            </button>
            <button 
              onClick={() => handleOAuthLogin('vk')} 
              className="social-button vk"
              title="Зарегистрироваться через ВКонтакте"
            >
              <span className="social-icon">VK</span>
            </button>
            <button 
              onClick={() => handleOAuthLogin('twitter')} 
              className="social-button twitter"
              title="Зарегистрироваться через Twitter"
            >
              <span className="social-icon">🐦</span>
            </button>
          </div>
        </div>

        <div className="or-divider">
          <span>или</span>
        </div>

        <div className="register-form-section">
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleSubmit} className="register-form">
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
              placeholder="Никнейм (3-20 символов)"
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
            <input
              type="password"
              name="confirmPassword"
              placeholder="Подтвердите пароль"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
            <div className="terms-checkbox">
              <input
                type="checkbox"
                id="terms-checkbox-register"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
              />
              <label htmlFor="terms-checkbox-register">
                Я прочитал и согласен <Link href="/terms">Соглашение пользователя</Link>, <Link href="/privacy">Политика конфиденциальности</Link>
              </label>
            </div>
            <button type="submit" disabled={loading || !agreedToTerms} className="register-button">
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>

        <div className="login-prompt">
          <p>Уже есть аккаунт?</p>
          <Link href="/login" className="login-link">Войти</Link>
        </div>

        <div className="app-download-buttons">
          <a 
            href="https://apps.apple.com/app/bigo-live/id1112133309" 
            target="_blank" 
            rel="noopener noreferrer"
            className="app-store-button"
          >
            <img src="/app-store-badge.svg" alt="Download on the App Store" />
          </a>
          <a 
            href="https://play.google.com/store/apps/details?id=com.bigo.live" 
            target="_blank" 
            rel="noopener noreferrer"
            className="google-play-button"
          >
            <img src="/google-play-badge.svg" alt="GET IT ON Google Play" />
          </a>
        </div>
      </div>

      <style jsx>{`
        .bigo-register-page {
          min-height: 100vh;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .register-container {
          max-width: 500px;
          width: 100%;
          text-align: center;
        }

        .register-container h2 {
          font-size: 28px;
          margin-bottom: 30px;
          color: #333;
        }

        .or-divider {
          margin: 30px 0;
          position: relative;
          text-align: center;
        }

        .or-divider::before,
        .or-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #e0e0e0;
        }

        .or-divider::before {
          left: 0;
        }

        .or-divider::after {
          right: 0;
        }

        .or-divider span {
          background: #fff;
          padding: 0 15px;
          color: #999;
          font-size: 14px;
          position: relative;
        }

        .social-login-section {
          margin: 30px 0;
        }

        .social-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .social-button {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          font-weight: 600;
        }

        .social-button:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .social-button.facebook {
          background: #1877f2;
          color: #fff;
        }

        .social-button.google {
          background: #fff;
          color: #4285f4;
          border: 2px solid #e0e0e0;
        }

        .social-button.vk {
          background: #0077ff;
          color: #fff;
        }

        .social-button.twitter {
          background: #1da1f2;
          color: #fff;
        }

        .social-icon {
          font-size: 20px;
        }

        .register-form-section {
          margin: 30px 0;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .register-form input {
          padding: 12px 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .register-form input:focus {
          border-color: #667eea;
        }

        .terms-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
          font-size: 13px;
          color: #666;
          margin: 10px 0;
        }

        .terms-checkbox input[type="checkbox"] {
          margin-top: 3px;
          cursor: pointer;
        }

        .terms-checkbox label {
          cursor: pointer;
        }

        .terms-checkbox a {
          color: #667eea;
          text-decoration: underline;
        }

        .register-button {
          padding: 12px 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .register-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .register-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-prompt {
          margin: 20px 0;
        }

        .login-prompt p {
          color: #333;
          margin-bottom: 10px;
        }

        .login-link {
          color: #667eea;
          text-decoration: underline;
          font-weight: 600;
        }

        .login-link:hover {
          color: #764ba2;
        }

        .app-download-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .app-store-button,
        .google-play-button {
          display: inline-block;
          height: 50px;
        }

        .app-store-button img,
        .google-play-button img {
          height: 100%;
          width: auto;
        }

        .error {
          background: #fee;
          color: #c33;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
}

