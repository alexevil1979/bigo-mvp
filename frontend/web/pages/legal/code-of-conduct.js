import Head from 'next/head';
import Link from 'next/link';

export default function CodeOfConduct() {
  return (
    <>
      <Head>
        <title>Правила поведения - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Правила поведения</h1>
        <p>Основные правила поведения на платформе NIO.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}

