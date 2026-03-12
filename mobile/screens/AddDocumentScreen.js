import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import ModalPicker from '../components/ModalPicker';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const DOC_TYPES = [
  { id: 'license', name: 'Водительское удостоверение', icon: '🪪' },
  { id: 'osago', name: 'ОСАГО', icon: '📋' },
  { id: 'kasko', name: 'КАСКО', icon: '🛡️' },
  { id: 'sts', name: 'СТС', icon: '📄' },
  { id: 'pts', name: 'ПТС', icon: '📑' },
  { id: 'diagnostic', name: 'Диагностическая карта', icon: '🔧' },
  { id: 'passport', name: 'Паспорт', icon: '🛂' },
  { id: 'other', name: 'Другой документ', icon: '📎' }
];

export default function AddDocumentScreen({ navigation, route }) {
  const { theme } = useTheme();
  const editDocument = route.params?.document;
  const isEdit = !!editDocument;

  const [cars, setCars] = useState([]);
  const [docType, setDocType] = useState(editDocument?.doc_type || 'osago');
  const [title, setTitle] = useState(editDocument?.title || '');
  const [carId, setCarId] = useState(editDocument?.car_id || null);
  const [docNumber, setDocNumber] = useState(editDocument?.doc_number || '');
  const [issueDate, setIssueDate] = useState(editDocument?.issue_date?.split('T')[0] || '');
  const [expiryDate, setExpiryDate] = useState(editDocument?.expiry_date?.split('T')[0] || '');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(String(editDocument?.notify_days_before || 30));
  const [notes, setNotes] = useState(editDocument?.notes || '');
  const [photo, setPhoto] = useState(editDocument?.photo_url || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  useEffect(() => {
    // Автозаполнение названия по типу документа (только для новых)
    const type = DOC_TYPES.find(t => t.id === docType);
    if (type && !title && !isEdit) {
      setTitle(type.name);
    }
  }, [docType]);

  const loadCars = async () => {
    try {
      const res = await api.get('/cars');
      setCars(res.data.cars);
    } catch (e) {
      console.error(e);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Нужен доступ к галерее');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Нужен доступ к камере');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title || !docType) {
      Alert.alert('Ошибка', 'Заполните название и тип документа');
      return;
    }

    setLoading(true);
    try {
      const data = {
        title,
        doc_type: docType,
        car_id: carId || null,
        doc_number: docNumber || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        notify_days_before: parseInt(notifyDaysBefore) || 30,
        notes: notes || null,
        photo_url: photo
      };

      if (isEdit) {
        await api.put(`/documents/${editDocument.id}`, data);
        Alert.alert('Успешно', 'Документ обновлён', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await api.post('/documents', data);
        Alert.alert('Успешно', 'Документ добавлен', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось сохранить');
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>{isEdit ? 'Редактирование' : 'Новый документ'}</Text>
      </View>

      <View style={styles.form}>
        {/* Тип документа */}
        <Text style={[styles.label, { color: theme.text }]}>Тип документа *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeList}>
          {DOC_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeItem,
                { backgroundColor: theme.surface, borderColor: theme.border },
                docType === type.id && styles.typeItemActive,
                docType === type.id && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => {
                setDocType(type.id);
                setTitle(type.name);
              }}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text style={[
                styles.typeText,
                { color: docType === type.id ? '#fff' : theme.textSecondary },
                docType === type.id && styles.typeTextActive
              ]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Название */}
        <Text style={[styles.label, { color: theme.text }]}>Название *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="Название документа"
          value={title}
          onChangeText={setTitle}
        />

        {/* Номер документа */}
        <Text style={[styles.label, { color: theme.text }]}>Номер документа</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          placeholder="1234 567890"
          value={docNumber}
          onChangeText={setDocNumber}
        />

        {/* Привязка к авто */}
        <Text style={[styles.label, { color: theme.text }]}>Привязать к автомобилю</Text>
        <ModalPicker
          items={[
            { label: 'Не привязывать', value: null },
            ...cars.map(c => ({ label: `${c.brand_name} ${c.model_name}`, value: c.id }))
          ]}
          selectedValue={carId}
          onValueChange={setCarId}
          placeholder="Привязать к автомобилю"
        />

        {/* Даты */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={[styles.label, { color: theme.text }]}>Дата выдачи</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholderTextColor={theme.textSecondary}
              placeholder="2024-01-15"
              value={issueDate}
              onChangeText={setIssueDate}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.label, { color: theme.text }]}>Срок действия</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholderTextColor={theme.textSecondary}
              placeholder="2025-01-15"
              value={expiryDate}
              onChangeText={setExpiryDate}
            />
          </View>
        </View>

        {/* Уведомление */}
        <Text style={[styles.label, { color: theme.text }]}>Напомнить за (дней)</Text>
        <View style={styles.notifyRow}>
          {['7', '14', '30', '60', '90'].map(days => (
            <TouchableOpacity
              key={days}
              style={[
                styles.notifyBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                notifyDaysBefore === days && styles.notifyBtnActive,
                notifyDaysBefore === days && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setNotifyDaysBefore(days)}
            >
              <Text style={[
                styles.notifyText,
                { color: notifyDaysBefore === days ? '#fff' : theme.textSecondary },
                notifyDaysBefore === days && styles.notifyTextActive
              ]}>
                {days}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Фото */}
        <Text style={[styles.label, { color: theme.text }]}>Фото документа</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={takePhoto}>
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={[styles.photoBtnText, { color: theme.textSecondary }]}>Камера</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={pickImage}>
            <Text style={styles.photoBtnIcon}>🖼️</Text>
            <Text style={[styles.photoBtnText, { color: theme.textSecondary }]}>Галерея</Text>
          </TouchableOpacity>
        </View>
        {photo && (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photo }} style={styles.photoImage} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto(null)}>
              <Text style={styles.photoRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Заметки */}
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

        {/* Кнопка сохранения */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary }, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>
            {loading ? 'Сохранение...' : 'Добавить документ'}
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
  headerTitle: {
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
  typeList: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  typeItemActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  typeTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  notifyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  notifyBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  notifyBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  notifyText: {
    color: '#64748b',
    fontWeight: '600',
  },
  notifyTextActive: {
    color: '#fff',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  photoBtnIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  photoBtnText: {
    color: '#64748b',
  },
  photoPreview: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  photoRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
