import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthToken } from '@/App';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';
import { Activity, AlertCircle, Globe, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].id);
    }
  }, [domains]);

  useEffect(() => {
    if (selectedDomain) {
      fetchStats();
    }
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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = selectedDomain ? `?domain_id=${selectedDomain}` : '';
      const response = await axios.get(`${API}/traffic/stats${params}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="dashboard-title">
            Dashboard
          </h1>
          <p className="text-gray-400">Monitor AI bot activity across your domains</p>
        </div>

        {/* Domain Selector */}
        {domains.length > 0 && (
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-2 block">Select Domain</label>
            <select
              data-testid="domain-selector"
              value={selectedDomain || ''}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="glass-effect px-4 py-2 rounded-lg text-white border border-white/10 focus:border-indigo-500 focus:outline-none"
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id} className="bg-[#1a1a2e]">
                  {domain.domain} {domain.is_verified ? '✓' : '(unverified)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="stat-card" data-testid="stat-total-requests">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Requests</p>
                <p className="text-3xl font-bold">{stats?.total_requests || 0}</p>
              </div>
              <Activity className="w-10 h-10 text-indigo-400 opacity-50" />
            </div>
          </Card>

          <Card className="stat-card" data-testid="stat-bot-requests">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Bot Requests</p>
                <p className="text-3xl font-bold text-red-400">{stats?.bot_requests || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-400 opacity-50" />
            </div>
          </Card>

          <Card className="stat-card" data-testid="stat-unique-ips">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Unique IPs</p>
                <p className="text-3xl font-bold">{stats?.unique_ips || 0}</p>
              </div>
              <Globe className="w-10 h-10 text-blue-400 opacity-50" />
            </div>
          </Card>

          <Card className="stat-card" data-testid="stat-detection-rate">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Detection Rate</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {stats?.total_requests > 0
                    ? Math.round((stats.bot_requests / stats.total_requests) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-yellow-400 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Top Bots */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Top Detected Bots</h3>
            <div className="space-y-3">
              {stats?.top_bots?.length > 0 ? (
                stats.top_bots.map((bot, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5" data-testid={`top-bot-${idx}`}>
                    <span className="font-medium">{bot.name}</span>
                    <span className="text-indigo-400">{bot.count} requests</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No bot activity detected yet</p>
              )}
            </div>
          </Card>

          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Risk Distribution</h3>
            <div className="space-y-3">
              {stats?.risk_distribution && Object.keys(stats.risk_distribution).length > 0 ? (
                Object.entries(stats.risk_distribution).map(([risk, count]) => (
                  <div key={risk} className="flex items-center justify-between p-3 rounded-lg bg-white/5" data-testid={`risk-${risk}`}>
                    <span className="font-medium capitalize">{risk} Risk</span>
                    <span className={getRiskColor(risk)}>{count} requests</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No risk data available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="glass-effect p-6">
          <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="recent-activity-table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">IP Address</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Bot Detected</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Path</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_activity?.length > 0 ? (
                  stats.recent_activity.map((log, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5" data-testid={`activity-row-${idx}`}>
                      <td className="py-3 px-4 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm font-mono">{log.ip_address}</td>
                      <td className="py-3 px-4 text-sm">{log.detected_bot || 'None'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-sm capitalize ${getRiskColor(log.risk_level)}`}>
                          {log.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">{log.request_path}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No recent activity
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
