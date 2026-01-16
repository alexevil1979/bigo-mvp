import Head from 'next/head';
import Link from 'next/link';

export default function Copyright() {
  return (
    <>
      <Head>
        <title>Политика авторского права - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Политика авторского права</h1>
        <p>Информация о защите авторских прав на платформе NIO.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



