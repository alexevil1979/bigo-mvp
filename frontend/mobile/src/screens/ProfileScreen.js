import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export default function ProfileScreen() {
  const { user, logout, token, API_URL } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(response.data.user);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.nickname?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.nickname}>{profile?.nickname || user?.nickname}</Text>
        <Text style={styles.email}>{profile?.email || user?.email}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.coins || 0}</Text>
          <Text style={styles.statLabel}>Монеты</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.beans || 0}</Text>
          <Text style={styles.statLabel}>Бобы</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {profile?.stats?.totalStreams || 0}
          </Text>
          <Text style={styles.statLabel}>Стримов</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a'
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff'
  },
  nickname: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  email: {
    fontSize: 14,
    color: '#aaa'
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 14,
    color: '#aaa'
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto'
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

