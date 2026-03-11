import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert
} from 'react-native';
import api from '../services/api';

export default function CarDetailScreen({ route, navigation }) {
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
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
      <TouchableOpacity style={styles.mileageCard} onPress={() => setMileageModal(true)}>
        <Text style={styles.mileageLabel}>Пробег</Text>
        <Text style={styles.mileageValue}>
          {(car.mileage || 0).toLocaleString()} км
        </Text>
        <Text style={styles.mileageHint}>Нажмите для обновления</Text>
      </TouchableOpacity>

      {/* Кнопки действий */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AddExpense', { carId: id, carName })}
        >
          <Text style={styles.actionIcon}>MDL</Text>
          <Text style={styles.actionText}>Расход</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AddService', { carId: id, carName })}
        >
          <Text style={styles.actionIcon}>🔧</Text>
          <Text style={styles.actionText}>ТО</Text>
        </TouchableOpacity>
      </View>

      {/* Статистика */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {stats?.byCategory
              ? Math.round(stats.byCategory.reduce((s, c) => s + parseFloat(c.total), 0)).toLocaleString()
              : '0'}
          </Text>
          <Text style={styles.statLabel}>MDL всего</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {stats?.byMonth?.length > 0
              ? Math.round(stats.byMonth.reduce((s, m) => s + parseFloat(m.total), 0) / stats.byMonth.length).toLocaleString()
              : '0'}
          </Text>
          <Text style={styles.statLabel}>MDL/мес</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {stats?.fuel?.avgConsumption || '—'}
          </Text>
          <Text style={styles.statLabel}>л/100км</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{service.length}</Text>
          <Text style={styles.statLabel}>Записей ТО</Text>
        </View>
      </View>

      {/* Расходы по категориям */}
      {stats?.byCategory?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Расходы</Text>
          {stats.byCategory.map(cat => (
            <View key={cat.name} style={styles.expenseRow}>
              <Text style={styles.expenseName}>{cat.name}</Text>
              <Text style={styles.expenseValue}>
                {parseFloat(cat.total).toLocaleString()} MDL
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* История ТО */}
      {service.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Последние работы</Text>
          {service.map(rec => (
            <View key={rec.id} style={styles.serviceCard}>
              <Text style={styles.serviceType}>{rec.service_type_name}</Text>
              <Text style={styles.serviceDate}>
                {new Date(rec.date).toLocaleDateString('ru')}
                {rec.mileage && ` • ${rec.mileage.toLocaleString()} км`}
              </Text>
              {rec.cost && (
                <Text style={styles.serviceCost}>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Обновить пробег</Text>
            <TextInput
              style={styles.modalInput}
              value={newMileage}
              onChangeText={setNewMileage}
              keyboardType="numeric"
              placeholder="Введите пробег"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setMileageModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={updateMileage}>
                <Text style={styles.modalBtnSaveText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    backgroundColor: '#2563eb',
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
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  mileageLabel: {
    color: '#64748b',
    marginBottom: 4,
  },
  mileageValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
  },
  mileageHint: {
    color: '#94a3b8',
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
    backgroundColor: '#2563eb',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    color: '#64748b',
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
    color: '#1e293b',
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  expenseName: {
    color: '#1e293b',
  },
  expenseValue: {
    fontWeight: '600',
    color: '#1e293b',
  },
  serviceCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  serviceType: {
    fontWeight: '600',
    color: '#1e293b',
  },
  serviceDate: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  serviceCost: {
    color: '#2563eb',
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
    backgroundColor: '#fff',
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
    borderColor: '#e2e8f0',
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
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: '#64748b',
  },
  modalBtnSave: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalBtnSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
});
