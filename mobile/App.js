import React, { useState, useEffect, useRef } from 'react';
import { Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import api from './services/api';
import NotificationService from './services/NotificationService';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import GarageScreen from './screens/GarageScreen';
import CarDetailScreen from './screens/CarDetailScreen';
import RemindersScreen from './screens/RemindersScreen';
import AddCarScreen from './screens/AddCarScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import AddServiceScreen from './screens/AddServiceScreen';
import AddReminderScreen from './screens/AddReminderScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import AddDocumentScreen from './screens/AddDocumentScreen';
import FuelMapScreen from './screens/FuelMapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Главная"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🏠</Text> }}
      />
      <Tab.Screen
        name="Гараж"
        component={GarageScreen}
        options={{ tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🚗</Text> }}
      />
      <Tab.Screen
        name="Документы"
        component={DocumentsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>📄</Text> }}
      />
      <Tab.Screen
        name="Заправки"
        component={FuelMapScreen}
        options={{ tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>⛽</Text> }}
      />
      <Tab.Screen
        name="Напоминания"
        component={RemindersScreen}
        options={{ tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🔔</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, isDark, ready } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    checkAuth();
    initializeNotifications();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      // Запрашиваем разрешение на уведомления
      await NotificationService.requestPermissions();

      // Настройка канала для Android
      await NotificationService.setupNotificationChannel();
    } catch (e) {
      console.log('Уведомления недоступны:', e.message);
    }

    // Слушатель входящих уведомлений (когда приложение открыто)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Получено уведомление:', notification);
    });

    // Слушатель нажатий на уведомления
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Нажатие на уведомление:', data);
    });
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      }
    } catch (e) {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    await AsyncStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  if (loading || !ready) return null;

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.danger,
    },
  };

  return (
    <AuthProvider value={{ user, login, register, logout, expoPushToken }}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="CarDetail" component={CarDetailScreen} />
              <Stack.Screen name="AddCar" component={AddCarScreen} />
              <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
              <Stack.Screen name="AddService" component={AddServiceScreen} />
              <Stack.Screen name="AddReminder" component={AddReminderScreen} />
              <Stack.Screen name="AddDocument" component={AddDocumentScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style={theme.statusBar} />
      </NavigationContainer>
    </AuthProvider>
  );
}
