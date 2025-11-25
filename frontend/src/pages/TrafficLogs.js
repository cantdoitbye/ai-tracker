import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthToken } from '@/App';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, MapPin, Activity } from 'lucide-react';

export default function TrafficLogs() {
  const [logs, setLogs] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomains();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedDomain]);

  const fetchDomains = async () => {
    try {
      const response = await axios.get(`${API}/domains`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setDomains(response.data);
    } catch (error) {
      toast.error('Failed to fetch domains');
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = selectedDomain ? `?domain_id=${selectedDomain}` : '';
      const response = await axios.get(`${API}/traffic/logs${params}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setLogs(response.data);
    } catch (error) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = selectedDomain ? `?domain_id=${selectedDomain}&format=${format}` : `?format=${format}`;
      const response = await axios.get(`${API}/traffic/export${params}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'traffic_logs.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'traffic_logs.json');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="traffic-logs-title">
              Traffic Logs
            </h1>
            <p className="text-gray-400">View detailed bot detection logs</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              data-testid="export-csv-btn"
              onClick={() => handleExport('csv')}
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              data-testid="export-json-btn"
              onClick={() => handleExport('json')}
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-effect p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-2 block">Filter by Domain</label>
              <select
                data-testid="domain-filter"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="glass-effect px-4 py-2 rounded-lg text-white border border-white/10 focus:border-indigo-500 focus:outline-none w-full"
              >
                <option value="" className="bg-[#1a1a2e]">All Domains</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id} className="bg-[#1a1a2e]">
                    {domain.domain}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="glass-effect p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No traffic logs yet</h3>
              <p className="text-gray-400">Traffic logs will appear here once you integrate the tracking code</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin" data-testid="logs-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Timestamp</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">IP Address</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Bot Detected</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Confidence</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Location</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`log-row-${idx}`}>
                      <td className="py-3 px-4 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm font-mono">{log.ip_address}</td>
                      <td className="py-3 px-4 text-sm">
                        {log.detected_bot ? (
                          <span className="text-red-400 font-medium">{log.detected_bot}</span>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">{log.bot_provider || '-'}</td>
                      <td className="py-3 px-4 text-sm">
                        {log.confidence_score > 0 ? (
                          <span className="font-medium">{(log.confidence_score * 100).toFixed(0)}%</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(log.risk_level)}`}>
                          {log.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {log.geo_location ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span>{log.geo_location.city}, {log.geo_location.country}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">{log.request_path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
