import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import ModalPicker from '../components/ModalPicker';
import api from '../services/api';
import NotificationService from '../services/NotificationService';

export default function AddReminderScreen({ navigation }) {
  const [cars, setCars] = useState([]);
  const [carId, setCarId] = useState(null);
  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState('date');
  const [dueDate, setDueDate] = useState('');
  const [dueMileage, setDueMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCars();
    // Устанавливаем дату по умолчанию через месяц
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setDueDate(nextMonth.toISOString().split('T')[0]);
  }, []);

  const loadCars = async () => {
    try {
      const res = await api.get('/cars');
      setCars(res.data.cars);
      if (res.data.cars.length > 0) {
        setCarId(res.data.cars[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!carId || !title) {
      Alert.alert('Ошибка', 'Выберите автомобиль и введите название');
      return;
    }

    if (reminderType === 'date' && !dueDate) {
      Alert.alert('Ошибка', 'Укажите дату');
      return;
    }

    if (reminderType === 'mileage' && !dueMileage) {
      Alert.alert('Ошибка', 'Укажите пробег');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/reminders', {
        car_id: carId,
        title,
        reminder_type: reminderType,
        due_date: reminderType === 'date' ? dueDate : null,
        due_mileage: reminderType === 'mileage' ? parseInt(dueMileage) : null,
        notes: notes || null
      });

      // Планируем локальное уведомление для напоминания по дате
      if (reminderType === 'date' && res.data.reminder) {
        const car = cars.find(c => c.id === carId);
        await NotificationService.scheduleReminder({
          ...res.data.reminder,
          brand_name: car?.brand_name,
          model_name: car?.model_name
        });
      }

      Alert.alert('Успешно', 'Напоминание создано', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось создать');
    } finally {
      setLoading(false);
    }
  };

  const quickReminders = [
    { title: 'Замена масла', mileage: 10000 },
    { title: 'ТО', mileage: 15000 },
    { title: 'Страховка ОСАГО', days: 365 },
    { title: 'Техосмотр', days: 365 },
    { title: 'Замена шин', days: 180 },
  ];

  const applyQuickReminder = (item) => {
    setTitle(item.title);
    if (item.mileage) {
      setReminderType('mileage');
      const car = cars.find(c => c.id === carId);
      if (car?.mileage) {
        setDueMileage(String(car.mileage + item.mileage));
      }
    } else if (item.days) {
      setReminderType('date');
      const date = new Date();
      date.setDate(date.getDate() + item.days);
      setDueDate(date.toISOString().split('T')[0]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Отмена</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Новое напоминание</Text>
      </View>

      <View style={styles.form}>
        {/* Быстрые шаблоны */}
        <Text style={styles.label}>Быстрый выбор</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickList}>
          {quickReminders.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickItem}
              onPress={() => applyQuickReminder(item)}
            >
              <Text style={styles.quickText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Автомобиль *</Text>
        <ModalPicker
          items={cars.map(c => ({ label: `${c.brand_name} ${c.model_name}`, value: c.id }))}
          selectedValue={carId}
          onValueChange={setCarId}
          placeholder="Выберите автомобиль"
        />

        <Text style={styles.label}>Название *</Text>
        <TextInput
          style={styles.input}
          placeholder="Замена масла"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Тип напоминания</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, reminderType === 'date' && styles.typeBtnActive]}
            onPress={() => setReminderType('date')}
          >
            <Text style={[styles.typeBtnText, reminderType === 'date' && styles.typeBtnTextActive]}>
              По дате
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, reminderType === 'mileage' && styles.typeBtnActive]}
            onPress={() => setReminderType('mileage')}
          >
            <Text style={[styles.typeBtnText, reminderType === 'mileage' && styles.typeBtnTextActive]}>
              По пробегу
            </Text>
          </TouchableOpacity>
        </View>

        {reminderType === 'date' ? (
          <>
            <Text style={styles.label}>Дата *</Text>
            <TextInput
              style={styles.input}
              placeholder="2024-06-15"
              value={dueDate}
              onChangeText={setDueDate}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Пробег (км) *</Text>
            <TextInput
              style={styles.input}
              placeholder="60000"
              value={dueMileage}
              onChangeText={setDueMileage}
              keyboardType="numeric"
            />
          </>
        )}

        <Text style={styles.label}>Заметки</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Дополнительная информация..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Сохранение...' : 'Создать напоминание'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
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
  back: {
    color: '#2563eb',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  quickList: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  quickItem: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickText: {
    color: '#4338ca',
    fontWeight: '500',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeBtnText: {
    color: '#64748b',
    fontWeight: '500',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
