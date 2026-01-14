import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import Footer from '../components/Footer';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="app-wrapper">
        <Component {...pageProps} />
        <Footer />
      </div>
    </AuthProvider>
  );
}

