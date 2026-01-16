import Head from 'next/head';
import Link from 'next/link';

export default function Transparency() {
  return (
    <>
      <Head>
        <title>Отчёт об открытости - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Отчёт об открытости</h1>
        <p>Отчёты о прозрачности и открытости платформы NIO.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



