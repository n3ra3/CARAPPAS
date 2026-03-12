import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import ModalPicker from '../components/ModalPicker';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function AddCarScreen({ navigation }) {
  const { theme } = useTheme();
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [brandId, setBrandId] = useState(null);
  const [modelId, setModelId] = useState(null);
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (brandId) {
      loadModels(brandId);
    } else {
      setModels([]);
      setModelId(null);
    }
  }, [brandId]);

  const loadBrands = async () => {
    try {
      const res = await api.get('/catalog/brands');
      setBrands(res.data.brands);
    } catch (e) {
      console.error(e);
    }
  };

  const loadModels = async (id) => {
    try {
      const res = await api.get(`/catalog/brands/${id}/models`);
      setModels(res.data.models);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!brandId || !modelId) {
      Alert.alert('Ошибка', 'Выберите марку и модель');
      return;
    }

    setLoading(true);
    try {
      await api.post('/cars', {
        brand_id: brandId,
        model_id: modelId,
        year: year ? parseInt(year) : null,
        mileage: mileage ? parseInt(mileage) : 0,
        license_plate: licensePlate || null,
        vin: vin || null
      });
      Alert.alert('Успешно', 'Автомобиль добавлен', [
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: theme.primary }]}>← Отмена</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Добавить авто</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.text }]}>Марка *</Text>
        <ModalPicker
          items={brands.map(b => ({ label: b.name, value: b.id }))}
          selectedValue={brandId}
          onValueChange={setBrandId}
          placeholder="Выберите марку"
        />

        <Text style={[styles.label, { color: theme.text }]}>Модель *</Text>
        <ModalPicker
          items={models.map(m => ({ label: m.name, value: m.id }))}
          selectedValue={modelId}
          onValueChange={setModelId}
          placeholder="Выберите модель"
          enabled={models.length > 0}
        />

        <Text style={[styles.label, { color: theme.text }]}>Год выпуска</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="2020"
          value={year}
          onChangeText={setYear}
          keyboardType="numeric"
          maxLength={4}
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

        <Text style={[styles.label, { color: theme.text }]}>Госномер</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="А123БВ777"
          value={licensePlate}
          onChangeText={setLicensePlate}
          autoCapitalize="characters"
          maxLength={20}
        />

        <Text style={[styles.label, { color: theme.text }]}>VIN</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="XXXXXXXXXXXXXXXXX"
          value={vin}
          onChangeText={setVin}
          autoCapitalize="characters"
          maxLength={17}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Сохранение...' : 'Добавить'}
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
