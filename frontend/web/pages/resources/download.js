import Head from 'next/head';
import Link from 'next/link';

export default function Download() {
  return (
    <>
      <Head>
        <title>Скачать - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Скачать приложение NIO</h1>
        <p>Скачайте мобильное приложение NIO для iOS и Android.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}

