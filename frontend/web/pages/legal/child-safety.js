import Head from 'next/head';
import Link from 'next/link';

export default function ChildSafety() {
  return (
    <>
      <Head>
        <title>Безопасность детей - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Безопасность детей</h1>
        <p>NIO серьезно относится к безопасности детей и защите несовершеннолетних пользователей.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



