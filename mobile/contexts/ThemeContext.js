import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LayoutAnimation, Platform, UIManager } from 'react-native';

const THEME_STORAGE_KEY = 'carapp_mobile_theme';

const themes = {
  light: {
    mode: 'light',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    primary: '#2563eb',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    softPrimary: '#eff6ff',
    softWarning: '#fef3c7',
    softNeutral: '#f1f5f9',
    tabInactive: '#94a3b8',
    statusBar: 'dark'
  },
  dark: {
    mode: 'dark',
    background: '#0f172a',
    surface: '#111827',
    text: '#e5e7eb',
    textSecondary: '#94a3b8',
    border: '#334155',
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#f87171',
    softPrimary: 'rgba(59,130,246,0.2)',
    softWarning: 'rgba(245,158,11,0.2)',
    softNeutral: '#1e293b',
    tabInactive: '#64748b',
    statusBar: 'light'
  }
};

const ThemeContext = createContext(null);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setThemeName(stored);
        }
      } finally {
        setReady(true);
      }
    };

    loadTheme();
  }, []);

  const setTheme = async (nextTheme) => {
    if (nextTheme !== 'light' && nextTheme !== 'dark') {
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeName(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const toggleTheme = async () => {
    const nextTheme = themeName === 'dark' ? 'light' : 'dark';
    await setTheme(nextTheme);
  };

  const value = useMemo(
    () => ({
      themeName,
      theme: themes[themeName],
      isDark: themeName === 'dark',
      setTheme,
      toggleTheme,
      ready
    }),
    [themeName, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
