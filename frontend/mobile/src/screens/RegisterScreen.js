import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { login, API_URL } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !nickname) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        nickname
      });

      if (response.data.token) {
        login(response.data.token, response.data.user);
      }
    } catch (error) {
      Alert.alert(
        'Ошибка регистрации',
        error.response?.data?.error || 'Ошибка при регистрации'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Регистрация</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Никнейм"
        value={nickname}
        onChangeText={setNickname}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Пароль (минимум 6 символов)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Зарегистрироваться</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.link}
      >
        <Text style={styles.linkText}>
          Уже есть аккаунт? Войти
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0a0a0a'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333'
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  link: {
    marginTop: 20,
    alignItems: 'center'
  },
  linkText: {
    color: '#6366f1',
    fontSize: 14
  }
});

