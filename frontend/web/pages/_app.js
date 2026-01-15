import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <SEO />
      <div className="app-wrapper">
        <Component {...pageProps} />
        <Footer />
      </div>
    </AuthProvider>
  );
}

