import Head from 'next/head';
import Link from 'next/link';

export default function Blog() {
  return (
    <>
      <Head>
        <title>Блог - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Блог NIO</h1>
        <p>Новости и обновления платформы NIO.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



