import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import ModalPicker from '../components/ModalPicker';
import api from '../services/api';

export default function AddServiceScreen({ route, navigation }) {
  const { carId, carName } = route.params;
  const [serviceTypes, setServiceTypes] = useState([]);
  const [serviceTypeId, setServiceTypeId] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServiceTypes();
  }, []);

  const loadServiceTypes = async () => {
    try {
      const res = await api.get('/service/types');
      setServiceTypes(res.data.types);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!serviceTypeId) {
      Alert.alert('Ошибка', 'Выберите тип работ');
      return;
    }

    setLoading(true);
    try {
      await api.post('/service', {
        car_id: carId,
        service_type_id: serviceTypeId,
        date,
        mileage: mileage ? parseInt(mileage) : null,
        cost: cost ? parseFloat(cost) : null,
        notes: notes || null
      });
      Alert.alert('Успешно', 'Запись добавлена', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось добавить');
    } finally {
      setLoading(false);
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
        <Text style={styles.title}>Запись ТО</Text>
        <Text style={styles.subtitle}>{carName}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Тип работ *</Text>
        <ModalPicker
          items={serviceTypes.map(t => ({ label: t.name, value: t.id }))}
          selectedValue={serviceTypeId}
          onValueChange={setServiceTypeId}
          placeholder="Выберите тип работ"
        />

        <Text style={styles.label}>Дата</Text>
        <TextInput
          style={styles.input}
          placeholder="2024-01-15"
          value={date}
          onChangeText={setDate}
        />

        <Text style={styles.label}>Пробег (км)</Text>
        <TextInput
          style={styles.input}
          placeholder="50000"
          value={mileage}
          onChangeText={setMileage}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Стоимость (MDL)</Text>
        <TextInput
          style={styles.input}
          placeholder="5000"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Заметки</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Что было сделано, какие запчасти..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Сохранение...' : 'Добавить запись'}
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
  subtitle: {
    color: '#64748b',
    marginTop: 4,
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
    minHeight: 100,
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
