import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from 'react-native';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

export default function Chat({ streamId, user }) {
  const { API_URL } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!streamId || !user) return;

    const socket = io(API_URL);
    socketRef.current = socket;

    socket.emit('join-stream-chat', {
      streamId,
      userId: user.id,
      nickname: user.nickname
    });

    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [streamId, user]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('send-message', {
      streamId,
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Чат</Text>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text style={styles.nickname}>{item.nickname}:</Text>
            <Text style={styles.text}>{item.message}</Text>
          </View>
        )}
        style={styles.messagesList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Введите сообщение..."
          placeholderTextColor="#888"
          maxLength={500}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Отправить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginTop: 10
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  messagesList: {
    maxHeight: 200
  },
  message: {
    flexDirection: 'row',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4
  },
  nickname: {
    color: '#6366f1',
    fontWeight: 'bold',
    marginRight: 5
  },
  text: {
    color: '#fff',
    flex: 1
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 10
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 10,
    borderRadius: 4,
    marginRight: 10
  },
  sendButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 4,
    justifyContent: 'center'
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

