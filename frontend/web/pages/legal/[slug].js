import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from '../../lib/axios';
import Header from '../../components/Header';
import SEO from '../../components/SEO';

export default function LegalPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) {
      fetchPage();
    }
  }, [slug]);

  const fetchPage = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/content/page/${slug}`
      );
      setPage(response.data.page);
    } catch (err) {
      console.error('Ошибка загрузки страницы:', err);
      setError('Страница не найдена');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <Header />
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container">
        <Header />
        <div className="error-page">
          <h1>Страница не найдена</h1>
          <p>{error || 'Запрашиваемая страница не существует'}</p>
          <Link href="/">Вернуться на главную</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${page.title} - NIO - LIVE`}
        description={page.metaDescription || page.title}
        keywords="NIO, правовые документы, политика конфиденциальности"
      />
      <div className="container">
        <Header />
        <main className="legal-page">
          <div className="legal-content">
            <h1>{page.title}</h1>
            <div 
              className="legal-text"
              dangerouslySetInnerHTML={{ __html: page.content.replace(/\n/g, '<br />') }}
            />
          </div>
        </main>
      </div>

      <style jsx>{`
        .legal-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .legal-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .legal-content h1 {
          font-size: 32px;
          color: #333;
          margin-bottom: 30px;
          font-weight: 700;
        }

        .legal-text {
          color: #333;
          line-height: 1.8;
          font-size: 16px;
        }

        .legal-text p {
          margin-bottom: 15px;
        }

        .legal-text h2 {
          font-size: 24px;
          margin-top: 30px;
          margin-bottom: 15px;
          color: #667eea;
        }

        .legal-text h3 {
          font-size: 20px;
          margin-top: 25px;
          margin-bottom: 12px;
          color: #333;
        }

        .legal-text ul,
        .legal-text ol {
          margin-left: 30px;
          margin-bottom: 15px;
        }

        .legal-text li {
          margin-bottom: 8px;
        }

        .loading {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }

        .error-page {
          text-align: center;
          padding: 60px 20px;
        }

        .error-page h1 {
          font-size: 32px;
          color: #dc2626;
          margin-bottom: 15px;
        }

        .error-page p {
          color: #666;
          margin-bottom: 30px;
        }

        .error-page a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .error-page a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .legal-page {
            padding: 20px 10px;
          }

          .legal-content {
            padding: 20px;
          }

          .legal-content h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </>
  );
}



