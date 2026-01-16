import Head from 'next/head';
import Link from 'next/link';

export default function AntiBullying() {
  return (
    <>
      <Head>
        <title>Политика по борьбе с буллингом - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Политика по борьбе с буллингом</h1>
        <p>NIO не терпит буллинга и преследования на платформе.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



