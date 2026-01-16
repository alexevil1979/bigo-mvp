import Head from 'next/head';
import Link from 'next/link';

export default function LawEnforcement() {
  return (
    <>
      <Head>
        <title>Запрос правоохранительных органов - NIO</title>
      </Head>
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1>Запрос правоохранительных органов</h1>
        <p>Информация для правоохранительных органов о запросах данных.</p>
        <p><Link href="/">← Вернуться на главную</Link></p>
      </div>
    </>
  );
}



