import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import ModalPicker from '../components/ModalPicker';
import api from '../services/api';
import NotificationService from '../services/NotificationService';
import { useTheme } from '../contexts/ThemeContext';

export default function AddReminderScreen({ navigation }) {
  const { theme } = useTheme();
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: theme.primary }]}>← Отмена</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Новое напоминание</Text>
      </View>

      <View style={styles.form}>
        {/* Быстрые шаблоны */}
        <Text style={[styles.label, { color: theme.text }]}>Быстрый выбор</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickList}>
          {quickReminders.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickItem, { backgroundColor: theme.softPrimary }]}
              onPress={() => applyQuickReminder(item)}
            >
              <Text style={[styles.quickText, { color: theme.primary }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: theme.text }]}>Автомобиль *</Text>
        <ModalPicker
          items={cars.map(c => ({ label: `${c.brand_name} ${c.model_name}`, value: c.id }))}
          selectedValue={carId}
          onValueChange={setCarId}
          placeholder="Выберите автомобиль"
        />

        <Text style={[styles.label, { color: theme.text }]}>Название *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="Замена масла"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: theme.text }]}>Тип напоминания</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              reminderType === 'date' && styles.typeBtnActive,
              reminderType === 'date' && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setReminderType('date')}
          >
            <Text style={[
              styles.typeBtnText,
              { color: theme.textSecondary },
              reminderType === 'date' && styles.typeBtnTextActive
            ]}>
              По дате
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              reminderType === 'mileage' && styles.typeBtnActive,
              reminderType === 'mileage' && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setReminderType('mileage')}
          >
            <Text style={[
              styles.typeBtnText,
              { color: theme.textSecondary },
              reminderType === 'mileage' && styles.typeBtnTextActive
            ]}>
              По пробегу
            </Text>
          </TouchableOpacity>
        </View>

        {reminderType === 'date' ? (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Дата *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholderTextColor={theme.textSecondary}
              placeholder="2024-06-15"
              value={dueDate}
              onChangeText={setDueDate}
            />
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Пробег (км) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholderTextColor={theme.textSecondary}
              placeholder="60000"
              value={dueMileage}
              onChangeText={setDueMileage}
              keyboardType="numeric"
            />
          </>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Заметки</Text>
        <TextInput
          style={[styles.input, styles.textarea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="Дополнительная информация..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
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
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  back: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickText: {
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
