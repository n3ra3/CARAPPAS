import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';

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
  const [location, setLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [route, setRoute] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    getLocation();
  }, []);

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
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Определяем местоположение...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Не удалось определить местоположение</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={getLocation}>
          <Text style={styles.retryBtnText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <Text style={styles.topBtnText}>↻</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topBtn, styles.listBtn]}
          onPress={() => setShowList(!showList)}
        >
          <Text style={styles.topBtnText}>☰ {stations.length}</Text>
        </TouchableOpacity>
      </View>

      {/* Информация о маршруте */}
      {route && selectedStation && (
        <View style={styles.routeInfo}>
          <View style={styles.routeDetails}>
            <Text style={styles.routeName}>{selectedStation.name}</Text>
            <Text style={styles.routeMeta}>
              {route.distance} км • ~{route.duration} мин
            </Text>
          </View>
          <TouchableOpacity style={styles.clearBtn} onPress={clearRoute}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {routeLoading && (
        <View style={styles.routeLoadingOverlay}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.routeLoadingText}>Строим маршрут...</Text>
        </View>
      )}

      {/* Список заправок */}
      {showList && (
        <View style={styles.listPanel}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>АЗС рядом ({stations.length})</Text>
            <TouchableOpacity onPress={() => setShowList(false)}>
              <Text style={styles.listClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={stations}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.stationItem,
                  selectedStation?.id === item.id && styles.stationItemActive,
                ]}
                onPress={() => buildRoute(item)}
              >
                <View>
                  <Text style={styles.stationName}>{item.name}</Text>
                  {item.brand ? (
                    <Text style={styles.stationBrand}>{item.brand}</Text>
                  ) : null}
                </View>
                <Text style={styles.stationDist}>{item.distance.toFixed(1)} км</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
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
  stationDist: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
});
