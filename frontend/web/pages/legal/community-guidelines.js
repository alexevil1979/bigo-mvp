import Head from 'next/head';
import Link from 'next/link';

export default function CommunityGuidelines() {
  return (
    <>
      <Head>
        <title>Руководство сообщества - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Руководство сообщества</h1>
        <p>Руководящие принципы для сообщества NIO.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}

