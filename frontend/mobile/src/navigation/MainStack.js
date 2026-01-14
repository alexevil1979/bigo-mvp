import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import StreamScreen from '../screens/StreamScreen';
import CreateStreamScreen from '../screens/CreateStreamScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function StreamStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="StreamList" 
        component={HomeScreen}
        options={{ title: 'Стримы' }}
      />
      <Stack.Screen 
        name="Stream" 
        component={StreamScreen}
        options={{ title: 'Стрим' }}
      />
      <Stack.Screen 
        name="CreateStream" 
        component={CreateStreamScreen}
        options={{ title: 'Создать стрим' }}
      />
    </Stack.Navigator>
  );
}

export default function MainStack() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Streams" 
        component={StreamStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Профиль' }}
      />
    </Tab.Navigator>
  );
}

