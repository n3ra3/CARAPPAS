import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import FadeInView from '../components/FadeInView';

export default function CarDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { id } = route.params;
  const [car, setCar] = useState(null);
  const [stats, setStats] = useState(null);
  const [service, setService] = useState([]);
  const [mileageModal, setMileageModal] = useState(false);
  const [newMileage, setNewMileage] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [carRes, statsRes, serviceRes] = await Promise.all([
        api.get(`/cars/${id}`),
        api.get(`/expenses/car/${id}/stats`),
        api.get(`/service/car/${id}`)
      ]);
      setCar(carRes.data.car);
      setStats(statsRes.data.stats);
      setService(serviceRes.data.records.slice(0, 5));
      setNewMileage(String(carRes.data.car.mileage || 0));
    } catch (e) {
      console.error(e);
    }
  };

  const updateMileage = async () => {
    const mileageNum = parseInt(newMileage);
    if (!mileageNum || mileageNum < (car?.mileage || 0)) {
      Alert.alert('Ошибка', 'Пробег не может быть меньше текущего');
      return;
    }
    try {
      await api.put(`/cars/${id}/mileage`, { mileage: mileageNum });
      setCar({ ...car, mileage: mileageNum });
      setMileageModal(false);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось обновить пробег');
    }
  };

  const carName = car ? `${car.brand_name} ${car.model_name}` : '';

  if (!car) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{car.brand_name} {car.model_name}</Text>
        <Text style={styles.subtitle}>
          {car.year && `${car.year} г. • `}
          {car.license_plate}
        </Text>
      </View>

      {/* Пробег */}
      <TouchableOpacity style={[styles.mileageCard, { backgroundColor: theme.surface }]} onPress={() => setMileageModal(true)}>
        <Text style={[styles.mileageLabel, { color: theme.textSecondary }]}>Пробег</Text>
        <Text style={[styles.mileageValue, { color: theme.text }]}>
          {(car.mileage || 0).toLocaleString()} км
        </Text>
        <Text style={[styles.mileageHint, { color: theme.textSecondary }]}>Нажмите для обновления</Text>
      </TouchableOpacity>

      {/* Кнопки действий */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddExpense', { carId: id, carName })}
        >
          <Text style={styles.actionIcon}>MDL</Text>
          <Text style={styles.actionText}>Расход</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddService', { carId: id, carName })}
        >
          <Text style={styles.actionIcon}>🔧</Text>
          <Text style={styles.actionText}>ТО</Text>
        </TouchableOpacity>
      </View>

      {/* Статистика */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {stats?.byCategory
              ? Math.round(stats.byCategory.reduce((s, c) => s + parseFloat(c.total), 0)).toLocaleString()
              : '0'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>MDL всего</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {stats?.byMonth?.length > 0
              ? Math.round(stats.byMonth.reduce((s, m) => s + parseFloat(m.total), 0) / stats.byMonth.length).toLocaleString()
              : '0'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>MDL/мес</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {stats?.fuel?.avgConsumption || '—'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>л/100км</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{service.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Записей ТО</Text>
        </View>
      </View>

      {/* Расходы по категориям */}
      {stats?.byCategory?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Расходы</Text>
          {stats.byCategory.map(cat => (
            <View key={cat.name} style={[styles.expenseRow, { backgroundColor: theme.surface }]}>
              <Text style={[styles.expenseName, { color: theme.text }]}>{cat.name}</Text>
              <Text style={[styles.expenseValue, { color: theme.text }]}>
                {parseFloat(cat.total).toLocaleString()} MDL
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* История ТО */}
      {service.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Последние работы</Text>
          {service.map(rec => (
            <View key={rec.id} style={[styles.serviceCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.serviceType, { color: theme.text }]}>{rec.service_type_name}</Text>
              <Text style={[styles.serviceDate, { color: theme.textSecondary }]}>
                {new Date(rec.date).toLocaleDateString('ru')}
                {rec.mileage && ` • ${rec.mileage.toLocaleString()} км`}
              </Text>
              {rec.cost && (
                <Text style={[styles.serviceCost, { color: theme.primary }]}>
                  {parseFloat(rec.cost).toLocaleString()} MDL
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Модальное окно пробега */}
      <Modal visible={mileageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <FadeInView delay={10} duration={220} offsetY={16}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}> 
              <Text style={[styles.modalTitle, { color: theme.text }]}>Обновить пробег</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                placeholderTextColor={theme.textSecondary}
                value={newMileage}
                onChangeText={setNewMileage}
                keyboardType="numeric"
                placeholder="Введите пробег"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtnCancel, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={() => setMileageModal(false)}
                >
                  <Text style={[styles.modalBtnCancelText, { color: theme.textSecondary }]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnSave, { backgroundColor: theme.primary }]} onPress={updateMileage}>
                  <Text style={styles.modalBtnSaveText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeInView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  back: {
    color: '#fff',
    opacity: 0.8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  mileageCard: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  mileageLabel: {
    marginBottom: 4,
  },
  mileageValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  mileageHint: {
    fontSize: 12,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  expenseName: {
    fontSize: 14,
  },
  expenseValue: {
    fontWeight: '600',
  },
  serviceCard: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  serviceType: {
    fontWeight: '600',
  },
  serviceDate: {
    fontSize: 13,
    marginTop: 4,
  },
  serviceCost: {
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtnCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontWeight: '500',
  },
  modalBtnSave: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
});
