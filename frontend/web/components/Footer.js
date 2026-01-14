import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-column">
          <h3>Правовые основы</h3>
          <ul>
            <li><Link href="/legal/agreement">Соглашение</Link></li>
            <li><Link href="/legal/privacy">Политика конфиденциальности</Link></li>
            <li><Link href="/legal/child-safety">Безопасность детей</Link></li>
            <li><Link href="/legal/anti-bullying">Политика по борьбе с буллингом</Link></li>
            <li><Link href="/legal/cookies">Политика использования файлов cookie</Link></li>
            <li><Link href="/legal/law-enforcement">Запрос правоохранительных органов</Link></li>
            <li><Link href="/legal/copyright">Политика авторского права</Link></li>
            <li><Link href="/legal/code-of-conduct">Правила поведения</Link></li>
            <li><Link href="/legal/community-guidelines">Руководство сообщества</Link></li>
            <li><Link href="/legal/transparency">Отчёт об открытости</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Поддержка</h3>
          <ul>
            <li><Link href="/support/about">О нас</Link></li>
            <li><Link href="/support/contact">Связаться с нами</Link></li>
            <li><Link href="/support/agency">Агентское сотрудничество</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Ресурсы</h3>
          <ul>
            <li><Link href="/resources/download">Скачать</Link></li>
            <li><Link href="/resources/blog">Блог</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Партнеры</h3>
          <ul>
            <li><a href="https://imo.im" target="_blank" rel="noopener noreferrer">imo</a></li>
            <li><a href="https://likee.video" target="_blank" rel="noopener noreferrer">Likee</a></li>
            <li><a href="https://helloyo.com" target="_blank" rel="noopener noreferrer">Hello Yo</a></li>
            <li><a href="https://echoroom.com" target="_blank" rel="noopener noreferrer">Echo Room</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Соцсети</h3>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon facebook" aria-label="Facebook">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon twitter" aria-label="Twitter">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon instagram" aria-label="Instagram">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon youtube" aria-label="YouTube">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-download">
          <h3>СКАЧАЙТЕ ПРИЛОЖЕНИЕ!</h3>
          <div className="app-badges">
            <a href="https://apps.apple.com/app/bigo-live/id1112133309" target="_blank" rel="noopener noreferrer" className="app-badge">
              <span>📱 App Store</span>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.bigo.live" target="_blank" rel="noopener noreferrer" className="app-badge">
              <span>📱 Google Play</span>
            </a>
          </div>
        </div>
        <div className="footer-copyright">
          <p>Copyright © 2024-2026 NIO. All Rights Reserved.</p>
          <p><Link href="/legal/agreement">User Agreement</Link> and <Link href="/legal/privacy">Privacy Policy</Link></p>
        </div>
      </div>

      <style jsx>{`
        .footer {
          background: #ffffff;
          color: #333;
          padding: 60px 20px 30px;
          margin-top: 80px;
          border-top: 1px solid #e0e0e0;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 40px;
          margin-bottom: 40px;
        }

        .footer-column h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #333;
          border-bottom: 2px solid #6366f1;
          padding-bottom: 10px;
        }

        .footer-column ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-column ul li {
          margin-bottom: 12px;
        }

        .footer-column a {
          color: #666;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .footer-column a:hover {
          color: #6366f1;
        }

        .social-links {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .social-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s;
          color: #666;
        }

        .social-icon:hover {
          transform: translateY(-3px);
        }

        .social-icon.facebook:hover {
          color: #1877f2;
        }

        .social-icon.twitter:hover {
          color: #1da1f2;
        }

        .social-icon.instagram:hover {
          color: #e4405f;
        }

        .social-icon.youtube:hover {
          color: #ff0000;
        }

        .footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 40px;
          border-top: 1px solid #e0e0e0;
          flex-wrap: wrap;
          gap: 30px;
        }

        .footer-download h3 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 15px;
          color: #333;
        }

        .app-badges {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .app-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .app-badge:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        .app-badge span {
          font-size: 14px;
        }

        .footer-copyright {
          text-align: right;
          color: #999;
          font-size: 12px;
        }

        .footer-copyright p {
          margin: 5px 0;
        }

        .footer-copyright a {
          color: #6366f1;
          text-decoration: none;
        }

        .footer-copyright a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .footer-content {
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
          }

          .footer-bottom {
            flex-direction: column;
            text-align: center;
          }

          .footer-copyright {
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
}

