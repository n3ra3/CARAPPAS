import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
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
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Привет, {user?.name || 'Пользователь'}!</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Выйти</Text>
        </TouchableOpacity>
      </View>

      {/* Статистика */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{cars.length}</Text>
          <Text style={styles.statLabel}>Авто</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, totalReminders > 0 && styles.warning]}>
            {totalReminders}
          </Text>
          <Text style={styles.statLabel}>Напоминаний</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {totalExpenses.toLocaleString()} MDL
          </Text>
          <Text style={styles.statLabel}>Всего расходов</Text>
        </View>
      </View>

      {/* Напоминания */}
      {totalReminders > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Требует внимания</Text>
          {[...reminders.byDate, ...reminders.byMileage].slice(0, 3).map(r => (
            <View key={r.id} style={styles.reminderCard}>
              <Text style={styles.reminderTitle}>{r.title}</Text>
              <Text style={styles.reminderSub}>
                {r.brand_name} {r.model_name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Автомобили */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Мои автомобили</Text>
        {cars.length === 0 ? (
          <Text style={styles.emptyText}>Нет автомобилей</Text>
        ) : (
          cars.map(car => (
            <TouchableOpacity 
              key={car.id} 
              style={styles.carCard}
              onPress={() => navigation.navigate('CarDetail', { id: car.id })}
            >
              <Text style={styles.carTitle}>
                {car.brand_name} {car.model_name}
              </Text>
              <Text style={styles.carInfo}>
                {car.year && `${car.year} г. • `}
                {(car.mileage || 0).toLocaleString()} км
              </Text>
            </TouchableOpacity>
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
