import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FadeInView from '../components/FadeInView';
import PressableScale from '../components/PressableScale';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [cars, setCars] = useState([]);
  const [reminders, setReminders] = useState({ byDate: [], byMileage: [] });
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [carsRes, remindersRes] = await Promise.all([
        api.get('/cars'),
        api.get('/reminders/active')
      ]);
      setCars(carsRes.data.cars);
      setReminders(remindersRes.data.reminders);

      // Загрузка общих расходов
      if (carsRes.data.cars.length > 0) {
        const statsPromises = carsRes.data.cars.map(car =>
          api.get(`/expenses/car/${car.id}/stats`).catch(() => null)
        );
        const allStats = await Promise.all(statsPromises);
        const total = allStats.reduce((sum, res) => {
          if (!res?.data?.stats?.byCategory) return sum;
          return sum + res.data.stats.byCategory.reduce((s, c) => s + parseFloat(c.total), 0);
        }, 0);
        setTotalExpenses(Math.round(total));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalReminders = reminders.byDate.length + reminders.byMileage.length;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <FadeInView delay={20}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.greeting}>Привет, {user?.name || 'Пользователь'}!</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerIconBtn}>
            <Text style={styles.logout}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logout}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </View>
      </FadeInView>

      {/* Статистика */}
      <FadeInView delay={80}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={styles.statValue}>{cars.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Авто</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, totalReminders > 0 && styles.warning]}>
            {totalReminders}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Напоминаний</Text>
        </View>
      </View>
      </FadeInView>

      <FadeInView delay={130}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {totalExpenses.toLocaleString()} MDL
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Всего расходов</Text>
        </View>
      </View>
      </FadeInView>

      {/* Напоминания */}
      {totalReminders > 0 && (
        <FadeInView delay={180}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Требует внимания</Text>
          {[...reminders.byDate, ...reminders.byMileage].slice(0, 3).map(r => (
            <View key={r.id} style={[styles.reminderCard, { backgroundColor: theme.surface, borderLeftColor: theme.warning }]}>
              <Text style={[styles.reminderTitle, { color: theme.text }]}>{r.title}</Text>
              <Text style={[styles.reminderSub, { color: theme.textSecondary }]}>
                {r.brand_name} {r.model_name}
              </Text>
            </View>
          ))}
        </View>
        </FadeInView>
      )}

      {/* Автомобили */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Мои автомобили</Text>
        {cars.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Нет автомобилей</Text>
        ) : (
          cars.map((car, index) => (
            <FadeInView key={car.id} delay={220 + Math.min(index, 6) * 55}>
              <PressableScale 
                style={[styles.carCard, { backgroundColor: theme.surface }]}
                onPress={() => navigation.navigate('CarDetail', { id: car.id })}
              >
                <Text style={[styles.carTitle, { color: theme.text }]}> 
                  {car.brand_name} {car.model_name}
                </Text>
                <Text style={[styles.carInfo, { color: theme.textSecondary }]}> 
                  {car.year && `${car.year} г. • `}
                  {(car.mileage || 0).toLocaleString()} км
                </Text>
              </PressableScale>
            </FadeInView>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2563eb',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    paddingHorizontal: 4,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  logout: {
    color: '#fff',
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    color: '#64748b',
    marginTop: 4,
  },
  warning: {
    color: '#f59e0b',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1e293b',
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  reminderTitle: {
    fontWeight: '600',
    color: '#1e293b',
  },
  reminderSub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  carCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  carInfo: {
    color: '#64748b',
    marginTop: 4,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
});
