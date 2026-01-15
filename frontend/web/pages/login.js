import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import QRCodeLogin from '../components/QRCodeLogin';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(true);
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
    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`,
        formData,
        {
          timeout: 10000 // 10 секунд для логина
        }
      );

      if (response.data.token) {
        login(response.data.token, response.data.user);
        router.push('/');
      }
    } catch (err) {
      if (err.code === 'ERR_CERT_COMMON_NAME_INVALID' || err.code === 'ERR_CERT_AUTHORITY_INVALID') {
        setError('Ошибка SSL-сертификата. Обратитесь к администратору сервера.');
      } else if (err.code === 'ECONNABORTED' || err.code === 'ERR_TIMED_OUT' || err.code === 'ETIMEDOUT') {
        setError('Сервер не отвечает. Проверьте подключение к интернету или попробуйте позже.');
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Ошибка сети. Сервер недоступен. Проверьте подключение к интернету.');
      } else {
        setError(err.response?.data?.error || 'Ошибка входа. Проверьте email и пароль.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/oauth/${provider}`;
  };

  return (
    <div className="nio-login-page">
      <div className="login-container">
        {showQR ? (
          <>
            <QRCodeLogin />
            <div className="or-divider">
              <span>или</span>
            </div>
          </>
        ) : null}

        <div className="social-login-section">
          <div className="social-buttons">
            <button 
              onClick={() => handleOAuthLogin('facebook')} 
              className="social-button facebook"
              title="Войти через Facebook"
            >
              <span className="social-icon">f</span>
            </button>
            <button 
              onClick={() => handleOAuthLogin('google')} 
              className="social-button google"
              title="Войти через Google"
            >
              <span className="social-icon">G</span>
            </button>
            <button 
              onClick={() => handleOAuthLogin('vk')} 
              className="social-button vk"
              title="Войти через ВКонтакте"
            >
              <span className="social-icon">VK</span>
            </button>
            <button 
              onClick={() => handleOAuthLogin('twitter')} 
              className="social-button twitter"
              title="Войти через Twitter"
            >
              <span className="social-icon">🐦</span>
            </button>
          </div>
        </div>

        <div className="register-prompt">
          <p>Еще не присоединились?</p>
          <Link href="/register" className="register-link">Зарегистрироваться сейчас</Link>
        </div>

        <div className="login-form-section">
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error">{error}</div>}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>

        <div className="terms-checkbox">
          <input
            type="checkbox"
            id="terms-checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
          />
          <label htmlFor="terms-checkbox">
            Я прочитал и согласен <Link href="/terms">Соглашение пользователя</Link>, <Link href="/privacy">Политика конфиденциальности</Link>
          </label>
        </div>

        <div className="app-download-buttons">
          <a 
            href="https://apps.apple.com/app/bigo-live/id1112133309" 
            target="_blank" 
            rel="noopener noreferrer"
            className="app-store-button"
          >
            <span>📱 App Store</span>
          </a>
          <a 
            href="https://play.google.com/store/apps/details?id=com.bigo.live" 
            target="_blank" 
            rel="noopener noreferrer"
            className="google-play-button"
          >
            <span>📱 Google Play</span>
          </a>
        </div>
      </div>

      <style jsx>{`
        .nio-login-page {
          min-height: 100vh;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-container {
          max-width: 500px;
          width: 100%;
          text-align: center;
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

        .register-prompt {
          margin: 30px 0;
        }

        .register-prompt p {
          color: #333;
          margin-bottom: 10px;
        }

        .register-link {
          color: #667eea;
          text-decoration: underline;
          font-weight: 600;
        }

        .register-link:hover {
          color: #764ba2;
        }

        .login-form-section {
          margin: 30px 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .login-form input {
          padding: 12px 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .login-form input:focus {
          border-color: #667eea;
        }

        .login-button {
          padding: 12px 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .login-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .terms-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 20px 0;
          text-align: left;
          font-size: 13px;
          color: #666;
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

        .app-download-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .app-store-button,
        .google-play-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .app-store-button:hover,
        .google-play-button:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        .app-store-button span,
        .google-play-button span {
          font-size: 16px;
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

