import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const DOC_TYPE_NAMES = {
  license: 'Водительское удостоверение',
  osago: 'ОСАГО',
  kasko: 'КАСКО',
  sts: 'СТС',
  pts: 'ПТС',
  diagnostic: 'Диагностическая карта',
  passport: 'Паспорт',
  other: 'Другой документ'
};

const DOC_TYPE_ICONS = {
  license: '🪪',
  osago: '📋',
  kasko: '🛡️',
  sts: '📄',
  pts: '📑',
  diagnostic: '🔧',
  passport: '🛂',
  other: '📎'
};

export default function DocumentsScreen({ navigation }) {
  const [documents, setDocuments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [])
  );

  const loadDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleDelete = (id, title) => {
    Alert.alert(
      'Удалить документ?',
      `"${title}" будет удалён`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/documents/${id}`);
              loadDocuments();
            } catch (e) {
              Alert.alert('Ошибка', 'Не удалось удалить');
            }
          }
        }
      ]
    );
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'none', text: 'Бессрочный', color: '#64748b' };
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', text: 'Просрочен', color: '#ef4444', days: diffDays };
    } else if (diffDays <= 7) {
      return { status: 'critical', text: `${diffDays} дн.`, color: '#ef4444', days: diffDays };
    } else if (diffDays <= 30) {
      return { status: 'warning', text: `${diffDays} дн.`, color: '#f59e0b', days: diffDays };
    } else if (diffDays <= 90) {
      return { status: 'soon', text: `${diffDays} дн.`, color: '#3b82f6', days: diffDays };
    } else {
      return { status: 'ok', text: `${diffDays} дн.`, color: '#22c55e', days: diffDays };
    }
  };

  const renderDocument = ({ item }) => {
    const expiry = getExpiryStatus(item.expiry_date);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('AddDocument', { document: item })}
        onLongPress={() => handleDelete(item.id, item.title)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{DOC_TYPE_ICONS[item.doc_type] || '📎'}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardType}>{DOC_TYPE_NAMES[item.doc_type]}</Text>
            {item.brand_name && (
              <Text style={styles.cardCar}>🚗 {item.brand_name} {item.model_name}</Text>
            )}
          </View>
          <View style={[styles.expiryBadge, { backgroundColor: expiry.color + '20' }]}>
            <Text style={[styles.expiryText, { color: expiry.color }]}>
              {expiry.text}
            </Text>
          </View>
        </View>
        {item.doc_number && (
          <Text style={styles.cardNumber}>№ {item.doc_number}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const expiringDocs = documents.filter(d => {
    const status = getExpiryStatus(d.expiry_date);
    return status.status === 'expired' || status.status === 'critical' || status.status === 'warning';
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Документы</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddDocument')}
          >
            <Text style={styles.addBtnText}>+ Добавить</Text>
          </TouchableOpacity>
        </View>
      </View>

      {expiringDocs.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertText}>
            {expiringDocs.length} док. требуют внимания
          </Text>
        </View>
      )}

      <FlatList
        data={documents}
        keyExtractor={item => item.id.toString()}
        renderItem={renderDocument}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyText}>Нет документов</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('AddDocument')}
            >
              <Text style={styles.emptyBtnText}>Добавить первый документ</Text>
            </TouchableOpacity>
          </View>
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  alertText: {
    color: '#92400e',
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  cardType: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  cardCar: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  cardNumber: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  expiryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
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
