import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Fuel, MapPin, RotateCcw, Loader } from 'lucide-react';

// Фикс иконок Leaflet для webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const fuelIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Компонент для перемещения карты к позиции
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14);
    }
  }, [position, map]);
  return null;
}

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
    fuel: el.tags?.['fuel:diesel'] === 'yes' ? 'Дизель' : '',
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
      coordinates: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      distance: (route.distance / 1000).toFixed(1),
      duration: Math.round(route.duration / 60),
    };
  }
  return null;
}

// Расчёт расстояния между двумя точками (км)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FuelMapPage() {
  const [userPos, setUserPos] = useState(null);
  const [stations, setStations] = useState([]);
  const [route, setRoute] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    setLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        try {
          const data = await fetchFuelStations(latitude, longitude);
          const sorted = data
            .map((s) => ({
              ...s,
              distance: getDistance(latitude, longitude, s.lat, s.lon),
            }))
            .sort((a, b) => a.distance - b.distance);
          setStations(sorted);
        } catch {
          setError('Не удалось загрузить заправки');
        }
        setLoading(false);
      },
      () => {
        setError('Не удалось определить местоположение. Разрешите доступ к геолокации.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const buildRoute = async (station) => {
    if (!userPos) return;
    setRouteLoading(true);
    setSelectedStation(station);
    try {
      const routeData = await fetchRoute(userPos[0], userPos[1], station.lat, station.lon);
      setRoute(routeData);
    } catch {
      setError('Не удалось построить маршрут');
    }
    setRouteLoading(false);
  };

  const clearRoute = () => {
    setRoute(null);
    setSelectedStation(null);
  };

  if (loading) {
    return (
      <div className="fuel-map-loading">
        <Loader size={32} className="spin" />
        <p>Определяем местоположение...</p>
      </div>
    );
  }

  return (
    <div className="fuel-map-page">
      <div className="page-header">
        <h1 className="page-title">
          <Fuel size={24} /> Заправки рядом
        </h1>
        <button className="btn btn-secondary" onClick={getUserLocation}>
          <RotateCcw size={16} /> Обновить
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="fuel-map-container">
        {/* Панель заправок */}
        <div className="fuel-sidebar">
          <h3 className="fuel-sidebar-title">
            Найдено: {stations.length} АЗС
          </h3>
          {route && selectedStation && (
            <div className="fuel-route-info">
              <div className="fuel-route-details">
                <strong>{selectedStation.name}</strong>
                <span>{route.distance} км • ~{route.duration} мин</span>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={clearRoute}>
                Сбросить
              </button>
            </div>
          )}
          <div className="fuel-list">
            {stations.map((s) => (
              <div
                key={s.id}
                className={`fuel-card ${selectedStation?.id === s.id ? 'fuel-card-active' : ''}`}
                onClick={() => buildRoute(s)}
              >
                <div className="fuel-card-header">
                  <MapPin size={16} />
                  <strong>{s.name}</strong>
                </div>
                {s.brand && <div className="fuel-card-brand">{s.brand}</div>}
                <div className="fuel-card-distance">
                  <Navigation size={14} />
                  {s.distance.toFixed(1)} км
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Карта */}
        <div className="fuel-map-wrapper">
          {userPos && (
            <MapContainer
              center={userPos}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <FlyToLocation position={userPos} />

              {/* Маркер пользователя */}
              <Marker position={userPos} icon={userIcon}>
                <Popup>Вы здесь</Popup>
              </Marker>

              {/* Маркеры заправок */}
              {stations.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lon]}
                  icon={fuelIcon}
                  eventHandlers={{ click: () => buildRoute(s) }}
                >
                  <Popup>
                    <strong>{s.name}</strong>
                    {s.brand && <br />}
                    {s.brand}
                    <br />
                    {s.distance.toFixed(1)} км
                  </Popup>
                </Marker>
              ))}

              {/* Маршрут */}
              {route && (
                <Polyline
                  positions={route.coordinates}
                  color="#2563eb"
                  weight={5}
                  opacity={0.8}
                />
              )}
            </MapContainer>
          )}
          {routeLoading && (
            <div className="fuel-map-overlay">
              <Loader size={24} className="spin" />
              Строим маршрут...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
