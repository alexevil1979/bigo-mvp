import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = 'http://localhost:5000'; // Измените на IP вашего компьютера для тестирования на устройстве

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Ошибка загрузки сохраненной аутентификации:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken, userData) => {
    try {
      setToken(newToken);
      setUser(userData);
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error) {
      console.error('Ошибка сохранения аутентификации:', error);
    }
  };

  const logout = async () => {
    try {
      setToken(null);
      setUser(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    loading,
    API_URL
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

