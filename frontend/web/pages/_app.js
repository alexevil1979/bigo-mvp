import { useState, useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import Footer from '../components/Footer';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <div className="app-wrapper">
        <Component {...pageProps} />
        <Footer />
      </div>
    </AuthProvider>
  );
}

