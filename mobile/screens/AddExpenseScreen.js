import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import ModalPicker from '../components/ModalPicker';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function AddExpenseScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { carId, carName } = route.params;
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get('/expenses/categories');
      setCategories(res.data.categories);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const isFuel = selectedCategory?.name?.toLowerCase().includes('топливо');

  const handleSave = async () => {
    if (!categoryId || !amount) {
      Alert.alert('Ошибка', 'Выберите категорию и укажите сумму');
      return;
    }

    setLoading(true);
    try {
      await api.post('/expenses', {
        car_id: carId,
        category_id: categoryId,
        amount: parseFloat(amount),
        description: description || null,
        date,
        mileage: mileage ? parseInt(mileage) : null,
        fuel_volume: liters ? parseFloat(liters) : null,
        fuel_price: pricePerLiter ? parseFloat(pricePerLiter) : null
      });
      Alert.alert('Успешно', 'Расход добавлен', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось добавить');
    } finally {
      setLoading(false);
    }
  };

  // Автоматический расчёт суммы для топлива
  useEffect(() => {
    if (isFuel && liters && pricePerLiter) {
      const total = parseFloat(liters) * parseFloat(pricePerLiter);
      setAmount(total.toFixed(2));
    }
  }, [liters, pricePerLiter, isFuel]);

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
        <Text style={[styles.title, { color: theme.text }]}>Добавить расход</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{carName}</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.text }]}>Категория *</Text>
        <ModalPicker
          items={categories.map(c => ({ label: c.name, value: c.id }))}
          selectedValue={categoryId}
          onValueChange={setCategoryId}
          placeholder="Выберите категорию"
        />

        {isFuel && (
          <>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: theme.text }]}>Литры</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  placeholderTextColor={theme.textSecondary}
                  placeholder="40"
                  value={liters}
                  onChangeText={setLiters}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: theme.text }]}>Цена за литр</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  placeholderTextColor={theme.textSecondary}
                  placeholder="55.50"
                  value={pricePerLiter}
                  onChangeText={setPricePerLiter}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Сумма (MDL) *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="1500"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, { color: theme.text }]}>Дата</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="2024-01-15"
          value={date}
          onChangeText={setDate}
        />

        <Text style={[styles.label, { color: theme.text }]}>Пробег (км)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="50000"
          value={mileage}
          onChangeText={setMileage}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: theme.text }]}>Описание</Text>
        <TextInput
          style={[styles.input, styles.textarea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="Комментарий..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Сохранение...' : 'Добавить расход'}
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
  subtitle: {
    marginTop: 4,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
