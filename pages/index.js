import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Shield, AlertTriangle, Activity, Users, MapPin, Thermometer, Play, Pause, Settings, Clock } from 'lucide-react';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    radiusKm: '',
    centerLat: '',
    centerLng: ''
  });

  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(30); // segundos
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const url = `/api/dashboard${params.toString() ? '?' + params.toString() : ''}`;
      console.log('🔗 Fazendo request para:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Erro ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Dados recebidos:', data);
      setDashboardData(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('❌ Erro completo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const toggleRealTime = useCallback(() => {
    if (isRealTimeEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setNextUpdate(null);
    } else {
      startRealTimeUpdates();
    }
    setIsRealTimeEnabled(!isRealTimeEnabled);
  }, [isRealTimeEnabled, updateInterval, fetchData]);

  const startRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const nextUpdateTime = new Date(Date.now() + updateInterval * 1000);
    setNextUpdate(nextUpdateTime);

    intervalRef.current = setInterval(() => {
      fetchData();
      const nextTime = new Date(Date.now() + updateInterval * 1000);
      setNextUpdate(nextTime);
    }, updateInterval * 1000);

    countdownRef.current = setInterval(() => {
      setNextUpdate(prev => prev ? new Date(prev.getTime()) : null);
    }, 1000);
  }, [updateInterval, fetchData]);

  const getTimeUntilNext = () => {
    if (!nextUpdate) return null;
    const now = new Date();
    const diff = Math.max(0, Math.floor((nextUpdate - now) / 1000));
    return diff;
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const initMap = async () => {
      if (typeof window === 'undefined' || mapInstanceRef.current || !mapRef.current) return;

      try {
        if (!window.L) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; 
          document.head.appendChild(link);

          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; 
          script.async = true;
          script.onload = () => {
            initializeLeafletMap();
          };
          document.head.appendChild(script);
        } else {
          initializeLeafletMap();
        }
      } catch (error) {
        console.error('Erro ao carregar Leaflet:', error);
      }
    };

    const initializeLeafletMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = window.L;
      const map = L.map(mapRef.current).setView([-23.55, -46.64], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',  {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = { L, map };

      if (dashboardData?.geographicHotspots) {
        updateMapMarkers();
      }
    };

    initMap();
  }, [dashboardData]);

  const updateMapMarkers = useCallback(() => {
      if (!mapInstanceRef.current || !dashboardData?.geographicHotspots) return;

      const { L, map } = mapInstanceRef.current;

      map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      dashboardData.geographicHotspots.forEach(hotspot => {
        const { latitude, longitude, riskLevel, alertCount, predominantAlertType } = hotspot;
        const color = riskLevel >= 80 ? '#ef4444' : riskLevel >= 50 ? '#f59e0b' : '#10b981';

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:2px solid white;color:white;font:bold 11px sans-serif;display:flex;align-items:center;justify-content:center;">${alertCount}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker([latitude, longitude], { icon: customIcon }).addTo(map)
          .bindPopup(`
            <strong>Coordenadas:</strong> ${latitude.toFixed(3)}, ${longitude.toFixed(3)}<br/>
            <strong>Risco:</strong> ${riskLevel}%<br/>
            <strong>Tipo:</strong> ${predominantAlertType}
          `);
      });

      if (dashboardData.geographicHotspots.length > 0) {
        const bounds = L.latLngBounds(
          dashboardData.geographicHotspots.map(h => [h.latitude, h.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [dashboardData]);

  useEffect(() => {
    if (mapInstanceRef.current && dashboardData?.geographicHotspots) {
      updateMapMarkers();
    }
  }, [dashboardData, updateMapMarkers]);

  useEffect(() => {
    if (isRealTimeEnabled) {
      startRealTimeUpdates();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isRealTimeEnabled, updateInterval, startRealTimeUpdates]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateData = () => {
    fetchData();
    if (isRealTimeEnabled) {
      startRealTimeUpdates();
    }
  };

  const handleIntervalChange = (newInterval) => {
    setUpdateInterval(newInterval);
    if (isRealTimeEnabled) {
      startRealTimeUpdates();
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="container">
        <div className="loading">
          <Activity className="animate-spin" size={24} style={{ marginRight: '10px' }} />
          Carregando dados do DisasterShield...
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="container">
        <div className="error">
          <AlertTriangle size={24} />
          <p>Erro: {error}</p>
        </div>
      </div>
    );
  }

  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
  const timeUntilNext = getTimeUntilNext();

  const deviceTypeChartData = dashboardData?.deviceTypeStatistics?.map(device => ({
    name: device.deviceType === 'WaterLevelSensor' ? 'Sensor de Nível' : 'Sensor de Fumaça',
    total: device.totalDevices,
    ativos: device.activeDevices,
    alertas: device.alertsGenerated,
    valorMedio: device.averageValue
  })) || [];

  const alertTrendsData = dashboardData?.alertTrends?.map(trend => ({
    data: new Date(trend.date).toLocaleDateString('pt-BR'),
    tipo: trend.alertType === 'Flood' ? 'Enchente' : trend.alertType === 'Fire' ? 'Incêndio' : trend.alertType,
    quantidade: trend.count,
    severidade: trend.severity
  })) || [];

  const riskLevelData = dashboardData?.geographicHotspots?.reduce((acc, hotspot) => {
    const level = hotspot.riskLevel >= 80 ? 'Alto' : hotspot.riskLevel >= 50 ? 'Médio' : 'Baixo';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(riskLevelData || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="container" style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#ffffff',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <style>{`
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; color: #60a5fa; }
        .header p { font-size: 1.1rem; color: #94a3b8; }
        .loading, .error { 
          display: flex; align-items: center; justify-content: center; 
          padding: 40px; background: #1e293b; border-radius: 12px; margin: 20px 0;
        }
        .error { color: #fca5a5; }
        .filters { 
          background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px;
        }
        .filters-grid { 
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 15px; align-items: end;
        }
        .filter-group label { 
          display: block; margin-bottom: 5px; font-weight: 600; color: #cbd5e1; 
        }
        .filter-group input, .filter-group select { 
          width: 100%; padding: 8px 12px; border: 1px solid #374151; 
          border-radius: 6px; background: #374151; color: #ffffff; 
        }
        .update-btn { 
          padding: 10px 20px; background: #3b82f6; border: none; 
          border-radius: 6px; color: white; cursor: pointer; font-weight: 600;
        }
        .update-btn:hover { background: #2563eb; }
        .update-btn:disabled { background: #6b7280; cursor: not-allowed; }
        .stats-grid { 
          display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
          gap: 20px; margin-bottom: 30px; 
        }
        .stat-card { 
          background: linear-gradient(135deg, #1e293b, #334155); 
          padding: 20px; border-radius: 12px; text-align: center; 
        }
        .stat-card h3 { 
          display: flex; align-items: center; justify-content: center; 
          gap: 8px; margin-bottom: 15px; color: #cbd5e1; 
        }
        .stat-card .value { 
          font-size: 2.5rem; font-weight: bold; color: #60a5fa; margin-bottom: 5px; 
        }
        .stat-card .label { color: #94a3b8; }
        .charts-grid { 
          display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); 
          gap: 20px; margin-bottom: 30px; 
        }
        .chart-card { 
          background: #1e293b; padding: 20px; border-radius: 12px; 
        }
        .chart-card h3 { 
          margin-bottom: 20px; color: #cbd5e1; display: flex; 
          align-items: center; gap: 8px; 
        }
        .map-section { 
          background: #1e293b; padding: 20px; border-radius: 12px; 
          margin-bottom: 20px; 
        }
        .map-section h3 { 
          margin-bottom: 20px; color: #cbd5e1; display: flex; 
          align-items: center; gap: 8px; 
        }
        .map-container { margin-bottom: 20px; }
        .hotspots-grid { 
          display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
          gap: 15px; 
        }
        .hotspot-card { 
          background: #374151; padding: 15px; border-radius: 8px; 
          border-left: 4px solid #10b981; 
        }
        .hotspot-card.medium { border-left-color: #f59e0b; }
        .hotspot-card.high { border-left-color: #ef4444; }
        .hotspot-card h4 { margin-bottom: 10px; color: #cbd5e1; }
        .hotspot-card p { margin: 5px 0; color: #94a3b8; font-size: 0.9rem; }
        .leaflet-popup-content-wrapper { 
          background: white !important; 
          border-radius: 8px !important; 
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <h1>
          <Shield size={48} style={{ verticalAlign: 'middle', marginRight: '15px' }} />
          DisasterShield
        </h1>
        <p>Dashboard de Monitoramento e Prevenção de Desastres</p>
      </div>

      {/* Controles de Tempo Real */}
      <div className="filters" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={toggleRealTime}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isRealTimeEnabled ? '#10b981' : '#6b7280',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              {isRealTimeEnabled ? <Pause size={16} /> : <Play size={16} />}
              {isRealTimeEnabled ? 'Pausar' : 'Iniciar'} Tempo Real
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} style={{ color: '#6b7280' }} />
              <select
                value={updateInterval}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  backgroundColor: '#1a1d21',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              >
                <option value={10}>10 segundos</option>
                <option value={30}>30 segundos</option>
                <option value={60}>1 minuto</option>
                <option value={300}>5 minutos</option>
                <option value={600}>10 minutos</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '14px', color: '#a8adb8' }}>
            {lastUpdate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14} />
                <span>Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}</span>
              </div>
            )}
            
            {isRealTimeEnabled && timeUntilNext !== null && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                padding: '4px 8px',
                backgroundColor: '#1a1d21',
                borderRadius: '4px',
                border: '1px solid #374151'
              }}>
                <Activity size={14} className={loading ? 'animate-spin' : ''} />
                <span>
                  {loading ? 'Atualizando...' : `Próxima em: ${timeUntilNext}s`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Data Inicial</label>
            <input
              type="datetime-local"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Data Final</label>
            <input
              type="datetime-local"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Raio (km)</label>
            <input
              type="number"
              placeholder="Ex: 10"
              value={filters.radiusKm}
              onChange={(e) => handleFilterChange('radiusKm', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Latitude Central</label>
            <input
              type="number"
              step="any"
              placeholder="Ex: -23.55"
              value={filters.centerLat}
              onChange={(e) => handleFilterChange('centerLat', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Longitude Central</label>
            <input
              type="number"
              step="any"
              placeholder="Ex: -46.64"
              value={filters.centerLng}
              onChange={(e) => handleFilterChange('centerLng', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button className="update-btn" onClick={updateData} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar Agora'}
            </button>
          </div>
        </div>
      </div>

      {/* Mostrar erro se houver, mas manter dados anteriores */}
      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={20} />
          <span>Erro na última atualização: {error}</span>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3><AlertTriangle size={20} /> Total de Alertas</h3>
          <div className="value">{dashboardData?.totalAlerts || 0}</div>
          <div className="label">Alertas registrados</div>
        </div>
        <div className="stat-card">
          <h3><Activity size={20} /> Dispositivos Ativos</h3>
          <div className="value">{dashboardData?.activeDevices || 0}</div>
          <div className="label">Sensores em operação</div>
        </div>
        <div className="stat-card">
          <h3><Shield size={20} /> Abrigos</h3>
          <div className="value">{dashboardData?.totalShelters || 0}</div>
          <div className="label">Locais de proteção</div>
        </div>
        <div className="stat-card">
          <h3><Users size={20} /> Recursos</h3>
          <div className="value">{dashboardData?.totalResources || 0}</div>
          <div className="label">Recursos disponíveis</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Estatísticas por Tipo de Dispositivo */}
        <div className="chart-card">
          <h3>Dispositivos por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceTypeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#667eea" name="Total" />
              <Bar dataKey="ativos" fill="#764ba2" name="Ativos" />
              <Bar dataKey="alertas" fill="#f093fb" name="Alertas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendências de Alertas */}
        <div className="chart-card">
          <h3>Tendências de Alertas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={alertTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="quantidade" stroke="#667eea" strokeWidth={3} name="Quantidade" />
              <Line type="monotone" dataKey="severidade" stroke="#f5576c" strokeWidth={3} name="Severidade" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Níveis de Risco */}
        <div className="chart-card">
          <h3>Distribuição de Níveis de Risco</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Valores Médios dos Sensores */}
        <div className="chart-card">
          <h3>Valores Médios dos Sensores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceTypeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="valorMedio" fill="#4facfe" name="Valor Médio" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mapa e Hotspots */}
      <div className="map-section">
        <h3><MapPin size={24} /> Hotspots Geográficos</h3>
        <div className="map-container">
          <div 
            ref={mapRef}
            style={{
              height: '400px',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid #374151',
              backgroundColor: '#1a1d21'
            }}
          />
        </div>
        
        <div className="hotspots-grid">
          {dashboardData?.geographicHotspots?.map((hotspot, index) => (
            <div 
              key={index} 
              className={`hotspot-card ${hotspot.riskLevel >= 80 ? 'high' : hotspot.riskLevel >= 50 ? 'medium' : 'low'}`}
            >
              <h4>Hotspot #{index + 1}</h4>
              <p><strong>Coordenadas:</strong> {hotspot.latitude.toFixed(3)}, {hotspot.longitude.toFixed(3)}</p>
              <p><strong>Alertas:</strong> {hotspot.alertCount}</p>
              <p><strong>Risco:</strong> {hotspot.riskLevel}%</p>
              <p><strong>Tipo:</strong> {hotspot.predominantAlertType === 'Flood' ? 'Enchente' : hotspot.predominantAlertType}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Estatísticas por Localização */}
      {dashboardData?.locationStatistics && (
        <div className="chart-card">
          <h3><Thermometer size={24} /> Estatísticas por Localização</h3>
          <div className="hotspots-grid">
            {dashboardData.locationStatistics.map((location, index) => (
              <div key={index} className="hotspot-card">
                <h4>Localização #{index + 1}</h4>
                <p><strong>Coordenadas:</strong> {location.latitude}, {location.longitude}</p>
                <p><strong>Enchentes:</strong> {location.floodIncidents}</p>
                <p><strong>Incêndios:</strong> {location.fireIncidents}</p>
                <p><strong>Total:</strong> {location.totalIncidents}</p>
                <p><strong>Score de Risco:</strong> {location.riskScore}</p>
                <p><strong>Último Incidente:</strong> {new Date(location.lastIncident).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}