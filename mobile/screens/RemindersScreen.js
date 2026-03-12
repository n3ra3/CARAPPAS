import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import api from '../services/api';
import NotificationService from '../services/NotificationService';

export default function RemindersScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const res = await api.get('/reminders');
      setReminders(res.data.reminders);
      
      // Синхронизируем локальные уведомления с актуальными напоминаниями
      await NotificationService.syncReminders(res.data.reminders);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/reminders/${id}/complete`);
      // Отменяем уведомление для выполненного напоминания
      await NotificationService.cancelReminder(id);
      loadReminders();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось выполнить');
    }
  };

  const activeReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  const renderReminder = ({ item }) => (
    <View style={[styles.card, item.is_completed && styles.completed]}>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, item.is_completed && styles.strikethrough]}>
          {item.title}
        </Text>
        <Text style={styles.cardSub}>
          {item.brand_name} {item.model_name}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.reminder_type === 'date'
              ? new Date(item.due_date).toLocaleDateString('ru')
              : `${item.due_mileage?.toLocaleString()} км`
            }
          </Text>
        </View>
      </View>
      {!item.is_completed && (
        <TouchableOpacity 
          style={styles.completeBtn}
          onPress={() => handleComplete(item.id)}
        >
          <Text style={styles.completeBtnText}>✓</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Напоминания</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddReminder')}
          >
            <Text style={styles.addBtnText}>+ Добавить</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[...activeReminders, ...completedReminders]}
        keyExtractor={item => item.id.toString()}
        renderItem={renderReminder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет напоминаний</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('AddReminder')}
            >
              <Text style={styles.emptyBtnText}>Создать напоминание</Text>
            </TouchableOpacity>
          </View>
        }
        ListHeaderComponent={
          activeReminders.length > 0 ? (
            <Text style={styles.sectionHeader}>
              Активные ({activeReminders.length})
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  completed: {
    opacity: 0.5,
    borderLeftColor: '#94a3b8',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  cardSub: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 13,
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  badgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '500',
  },
  completeBtn: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
