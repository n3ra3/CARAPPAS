import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

// Поиск заправок через Overpass API
async function fetchFuelStations(lat, lon, radius = 5000) {
  const query = `
    [out:json][timeout:10];
    node["amenity"="fuel"](around:${radius},${lat},${lon});
    out body;
  `;
  const resp = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await resp.json();
  return data.elements.map((el) => ({
    id: el.id,
    lat: el.lat,
    lon: el.lon,
    name: el.tags?.name || 'АЗС',
    brand: el.tags?.brand || el.tags?.operator || '',
  }));
}

// Построение маршрута через OSRM
async function fetchRoute(fromLat, fromLon, toLat, toLon) {
  const resp = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`
  );
  const data = await resp.json();
  if (data.routes && data.routes.length > 0) {
    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lon, lat]) => ({
        latitude: lat,
        longitude: lon,
      })),
      distance: (route.distance / 1000).toFixed(1),
      duration: Math.round(route.duration / 60),
    };
  }
  return null;
}

// Расстояние между точками (км)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FuelMapScreen() {
  const { theme } = useTheme();
  const [location, setLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState({});
  const [stationReviews, setStationReviews] = useState([]);
  const [stationMyReview, setStationMyReview] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [route, setRoute] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    getLocation();
  }, []);

  const loadReviewsSummary = async (stationsList) => {
    try {
      const ids = stationsList.map((s) => s.id);
      if (ids.length === 0) {
        setReviewsSummary({});
        return;
      }

      const res = await api.get('/fuel-reviews/summary', {
        params: { stationIds: ids.join(',') },
      });

      const summaryMap = {};
      (res.data.summaries || []).forEach((row) => {
        summaryMap[String(row.station_osm_id)] = {
          avgRating: Number(row.avg_rating),
          reviewsCount: row.reviews_count,
        };
      });
      setReviewsSummary(summaryMap);
    } catch {
      setReviewsSummary({});
    }
  };

  const loadStationReviews = async (stationId) => {
    setReviewsLoading(true);
    try {
      const res = await api.get(`/fuel-reviews/${stationId}`);
      const summary = res.data.summary || {};

      setStationReviews(res.data.reviews || []);
      setStationMyReview(res.data.myReview || null);
      setReviewsSummary((prev) => ({
        ...prev,
        [String(stationId)]: {
          avgRating: summary.avgRating,
          reviewsCount: summary.reviewsCount || 0,
        },
      }));

      if (res.data.myReview) {
        setReviewForm({
          rating: res.data.myReview.rating,
          comment: res.data.myReview.comment || '',
        });
      } else {
        setReviewForm({ rating: 5, comment: '' });
      }
    } catch {
      setStationReviews([]);
      setStationMyReview(null);
    } finally {
      setReviewsLoading(false);
    }
  };

  const getLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нет доступа к геолокации');
        setLoading(false);
        return;
      }
      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 5000,
        });
      } catch {
        // Фоллбэк — пониженная точность (Wi-Fi/сотовая)
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });

      const data = await fetchFuelStations(latitude, longitude);
      const sorted = data
        .map((s) => ({
          ...s,
          distance: getDistance(latitude, longitude, s.lat, s.lon),
        }))
        .sort((a, b) => a.distance - b.distance);
      setStations(sorted);
      await loadReviewsSummary(sorted);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось получить местоположение');
    }
    setLoading(false);
  };

  const buildRoute = async (station) => {
    if (!location) return;
    setRouteLoading(true);
    setSelectedStation(station);
    setShowList(false);
    loadStationReviews(station.id);
    try {
      const routeData = await fetchRoute(
        location.latitude, location.longitude,
        station.lat, station.lon
      );
      setRoute(routeData);
      if (routeData && mapRef.current) {
        mapRef.current.fitToCoordinates(routeData.coordinates, {
          edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
          animated: true,
        });
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось построить маршрут');
    }
    setRouteLoading(false);
  };

  const clearRoute = () => {
    setRoute(null);
    setSelectedStation(null);
    setStationReviews([]);
    setStationMyReview(null);
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const submitReview = async () => {
    if (!selectedStation) {
      return;
    }

    setReviewSubmitting(true);
    try {
      await api.post(`/fuel-reviews/${selectedStation.id}`, {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      await loadStationReviews(selectedStation.id);
      setReviewModalVisible(false);
    } catch (e) {
      const message = e.response?.data?.error || 'Не удалось сохранить отзыв';
      Alert.alert('Ошибка', message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Определяем местоположение...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.errorText, { color: theme.danger }]}>Не удалось определить местоположение</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={getLocation}>
          <Text style={styles.retryBtnText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      {/* Карта */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...location,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Маркеры АЗС */}
        {stations.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lon }}
            pinColor="red"
            onPress={() => buildRoute(s)}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{s.name}</Text>
                {s.brand ? <Text style={styles.calloutSub}>{s.brand}</Text> : null}
                <Text style={styles.calloutDist}>{s.distance.toFixed(1)} км</Text>
                <Text style={styles.calloutRating}>
                  {reviewsSummary[String(s.id)]?.avgRating
                    ? `★ ${reviewsSummary[String(s.id)].avgRating} (${reviewsSummary[String(s.id)].reviewsCount})`
                    : 'Нет отзывов'}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Маршрут */}
        {route && (
          <Polyline
            coordinates={route.coordinates}
            strokeColor="#2563eb"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Панель управления */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={getLocation}>
          <Text style={[styles.topBtnText, { color: theme.text }]}>↻</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topBtn, styles.listBtn]}
          onPress={() => setShowList(!showList)}
        >
          <Text style={[styles.topBtnText, { color: theme.text }]}>☰ {stations.length}</Text>
        </TouchableOpacity>
      </View>

      {/* Информация о маршруте */}
      {route && selectedStation && (
        <View style={[styles.routeInfo, { backgroundColor: theme.surface }]}>
          <View style={styles.routeDetails}>
            <Text style={[styles.routeName, { color: theme.text }]}>{selectedStation.name}</Text>
            <Text style={[styles.routeMeta, { color: theme.primary }]}>
              {route.distance} км • ~{route.duration} мин
            </Text>
            <Text style={[styles.routeRating, { color: theme.warning }]}>
              {reviewsSummary[String(selectedStation.id)]?.avgRating
                ? `★ ${reviewsSummary[String(selectedStation.id)].avgRating} (${reviewsSummary[String(selectedStation.id)].reviewsCount})`
                : 'Нет отзывов'}
            </Text>
            {stationReviews[0]?.comment ? (
              <Text style={[styles.routeReviewPreview, { color: theme.textSecondary }]} numberOfLines={1}>
                "{stationReviews[0].comment}"
              </Text>
            ) : null}
            <TouchableOpacity style={[styles.reviewBtn, { backgroundColor: theme.primary }]} onPress={() => setReviewModalVisible(true)}>
              <Text style={styles.reviewBtnText}>{stationMyReview ? 'Обновить отзыв' : 'Оставить отзыв'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.clearBtn, { backgroundColor: theme.softNeutral }]} onPress={clearRoute}>
            <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {routeLoading && (
        <View style={styles.routeLoadingOverlay}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.routeLoadingText, { color: theme.text }]}>Строим маршрут...</Text>
        </View>
      )}

      {/* Список заправок */}
      {showList && (
        <View style={[styles.listPanel, { backgroundColor: theme.surface }]}> 
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: theme.text }]}>АЗС рядом ({stations.length})</Text>
            <TouchableOpacity onPress={() => setShowList(false)}>
              <Text style={[styles.listClose, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={stations}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.stationItem,
                  { borderBottomColor: theme.border },
                  selectedStation?.id === item.id && styles.stationItemActive,
                  selectedStation?.id === item.id && { backgroundColor: theme.softPrimary },
                ]}
                onPress={() => buildRoute(item)}
              >
                <View>
                  <Text style={[styles.stationName, { color: theme.text }]}>{item.name}</Text>
                  {item.brand ? (
                    <Text style={[styles.stationBrand, { color: theme.textSecondary }]}>{item.brand}</Text>
                  ) : null}
                  <Text style={[styles.stationRating, { color: theme.warning }]}>
                    {reviewsSummary[String(item.id)]?.avgRating
                      ? `★ ${reviewsSummary[String(item.id)].avgRating} (${reviewsSummary[String(item.id)].reviewsCount})`
                      : 'Нет оценок'}
                  </Text>
                </View>
                <Text style={[styles.stationDist, { color: theme.primary }]}>{item.distance.toFixed(1)} км</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: theme.surface }]}> 
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Отзыв об АЗС</Text>
                  <Text style={[styles.modalStationName, { color: theme.textSecondary }]}>{selectedStation?.name}</Text>

                  <Text style={[styles.modalLabel, { color: theme.text }]}>Оценка</Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <TouchableOpacity
                        key={value}
                            style={[
                              styles.ratingChip,
                              { borderColor: theme.border },
                              reviewForm.rating === value && styles.ratingChipActive,
                              reviewForm.rating === value && { backgroundColor: theme.primary, borderColor: theme.primary },
                            ]}
                        onPress={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                      >
                        <Text
                              style={[
                                styles.ratingChipText,
                                { color: theme.text },
                                reviewForm.rating === value && styles.ratingChipTextActive,
                              ]}
                        >
                          {value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.modalLabel, { color: theme.text }]}>Комментарий</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    placeholder="Что понравилось/не понравилось"
                    placeholderTextColor={theme.textSecondary}
                    value={reviewForm.comment}
                    onChangeText={(text) => setReviewForm((prev) => ({ ...prev, comment: text }))}
                  />

                  {reviewsLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} style={{ marginBottom: 10 }} />
                  ) : null}

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: theme.softNeutral }]} onPress={() => setReviewModalVisible(false)}>
                      <Text style={[styles.modalCancelText, { color: theme.text }]}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalSubmitBtn, { backgroundColor: theme.primary }]}
                      onPress={submitReview}
                      disabled={reviewSubmitting}
                    >
                      <Text style={styles.modalSubmitText}>
                        {reviewSubmitting ? 'Сохранение...' : 'Сохранить'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'column',
    gap: 8,
  },
  topBtn: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  listBtn: {
    width: 'auto',
    paddingHorizontal: 12,
    borderRadius: 22,
  },
  topBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  callout: {
    padding: 4,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  calloutSub: {
    color: '#64748b',
    fontSize: 12,
  },
  calloutDist: {
    color: '#2563eb',
    fontSize: 12,
    marginTop: 2,
  },
  calloutRating: {
    color: '#92400e',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  routeInfo: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  routeDetails: {
    flex: 1,
  },
  routeName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1e293b',
  },
  routeMeta: {
    color: '#2563eb',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  routeRating: {
    color: '#92400e',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  routeReviewPreview: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
  reviewBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reviewBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 16,
    color: '#64748b',
  },
  routeLoadingOverlay: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  routeLoadingText: {
    color: '#1e293b',
    fontSize: 14,
  },
  listPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  listTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1e293b',
  },
  listClose: {
    fontSize: 18,
    color: '#64748b',
    padding: 4,
  },
  stationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stationItemActive: {
    backgroundColor: '#eff6ff',
  },
  stationName: {
    fontWeight: '500',
    fontSize: 15,
    color: '#1e293b',
  },
  stationBrand: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  stationRating: {
    color: '#92400e',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  stationDist: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalKeyboardWrapper: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '82%',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalStationName: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ratingChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  ratingChipText: {
    color: '#334155',
    fontWeight: '600',
  },
  ratingChipTextActive: {
    color: '#fff',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  modalCancelText: {
    color: '#334155',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
});
