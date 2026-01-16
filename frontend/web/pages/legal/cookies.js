import Head from 'next/head';
import Link from 'next/link';

export default function Cookies() {
  return (
    <>
      <Head>
        <title>Политика использования файлов cookie - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Политика использования файлов cookie</h1>
        <p>Информация о том, как NIO использует файлы cookie.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



