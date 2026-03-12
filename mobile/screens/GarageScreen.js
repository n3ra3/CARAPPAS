import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import FadeInView from '../components/FadeInView';
import PressableScale from '../components/PressableScale';

export default function GarageScreen({ navigation }) {
  const { theme } = useTheme();
  const [cars, setCars] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      const res = await api.get('/cars');
      setCars(res.data.cars);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCars();
    setRefreshing(false);
  };

  const renderCar = ({ item, index }) => (
    <FadeInView delay={120 + Math.min(index, 7) * 45}>
      <PressableScale 
        style={[styles.carCard, { backgroundColor: theme.surface }]}
        onPress={() => navigation.navigate('CarDetail', { id: item.id })}
      >
        <Text style={[styles.carTitle, { color: theme.text }]}>{item.brand_name} {item.model_name}</Text>
        <Text style={[styles.carInfo, { color: theme.textSecondary }]}> 
          {item.year && `${item.year} г.`}
        </Text>
        <View style={styles.carStats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{(item.mileage || 0).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>км</Text>
          </View>
          {item.license_plate && (
            <View style={[styles.plate, { backgroundColor: theme.softNeutral }]}> 
              <Text style={[styles.plateText, { color: theme.text }]}>{item.license_plate}</Text>
            </View>
          )}
        </View>
      </PressableScale>
    </FadeInView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <FadeInView delay={20}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}> 
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>Гараж</Text>
            <PressableScale
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('AddCar')}
            >
              <Text style={styles.addBtnText}>+ Добавить</Text>
            </PressableScale>
          </View>
        </View>
      </FadeInView>

      <FlatList
        data={cars}
        keyExtractor={item => item.id.toString()}
        renderItem={renderCar}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Нет автомобилей</Text>
            <PressableScale
              style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('AddCar')}
            >
              <Text style={styles.emptyBtnText}>Добавить первый авто</Text>
            </PressableScale>
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
  list: {
    padding: 16,
  },
  carCard: {
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
  carTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  carInfo: {
    color: '#64748b',
    marginTop: 4,
  },
  carStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    color: '#64748b',
  },
  plate: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  plateText: {
    fontWeight: '600',
    color: '#1e293b',
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
