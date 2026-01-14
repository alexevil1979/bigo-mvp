import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const { API_URL } = useAuth();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/streams`);
      setStreams(response.data.streams || []);
    } catch (error) {
      console.error('Ошибка загрузки стримов:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStreams();
  };

  const renderStream = ({ item }) => (
    <TouchableOpacity
      style={styles.streamCard}
      onPress={() => navigation.navigate('Stream', { streamId: item._id })}
    >
      <View style={styles.streamThumbnail}>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle}>{item.title}</Text>
        <Text style={styles.streamerName}>{item.streamer?.nickname}</Text>
        <Text style={styles.viewerCount}>👁️ {item.viewerCount} зрителей</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Активные стримы</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateStream')}
        >
          <Text style={styles.createButtonText}>+ Стрим</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={streams}
        renderItem={renderStream}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Нет активных стримов</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  streamCard: {
    backgroundColor: '#1a1a1a',
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden'
  },
  streamThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a2a',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 10
  },
  liveBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  streamInfo: {
    padding: 15
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  streamerName: {
    color: '#aaa',
    marginBottom: 5
  },
  viewerCount: {
    color: '#888',
    fontSize: 14
  },
  emptyText: {
    color: '#888',
    fontSize: 16
  }
});

