import Head from 'next/head';
import Link from 'next/link';

export default function Agency() {
  return (
    <>
      <Head>
        <title>Агентское сотрудничество - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Агентское сотрудничество</h1>
        <p>Информация об агентском сотрудничестве с NIO.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



