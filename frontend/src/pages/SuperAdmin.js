import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthToken, getUser } from '@/App';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Globe, Activity, TrendingUp, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const user = getUser();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_super_admin) {
      toast.error('Access denied: Super admin only');
      navigate('/dashboard');
      return;
    }
    fetchAdminStats();
    fetchAllUsers();
    fetchAllDomains();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const fetchAllDomains = async () => {
    try {
      const response = await axios.get(`${API}/admin/domains`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setDomains(response.data);
    } catch (error) {
      toast.error('Failed to fetch domains');
    }
  };

  const fetchUserActivity = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/user/${userId}/activity`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setUserActivity(response.data);
      setSelectedUser(userId);
    } catch (error) {
      toast.error('Failed to fetch user activity');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading admin panel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-red-400" />
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }} data-testid="super-admin-title">
              Super Admin Panel
            </h1>
          </div>
          <p className="text-gray-400">Monitor all users and system activity</p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="stat-card" data-testid="admin-stat-users">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold">{stats?.total_users || 0}</p>
              </div>
              <Users className="w-10 h-10 text-blue-400 opacity-50" />
            </div>
          </Card>

          <Card className="stat-card" data-testid="admin-stat-domains">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Domains</p>
                <p className="text-3xl font-bold">{stats?.total_domains || 0}</p>
              </div>
              <Globe className="w-10 h-10 text-indigo-400 opacity-50" />
            </div>
          </Card>

          <Card className="stat-card" data-testid="admin-stat-verified">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Verified</p>
                <p className="text-3xl font-bold text-green-400">{stats?.verified_domains || 0}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-400 opacity-50" />
            </div>
          </Card>

          <Card className="stat-card" data-testid="admin-stat-logs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Logs</p>
                <p className="text-3xl font-bold">{stats?.total_logs || 0}</p>
              </div>
              <Activity className="w-10 h-10 text-purple-400 opacity-50" />
            </div>
          </Card>

          <Card className="stat-card" data-testid="admin-stat-bots">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Bot Detections</p>
                <p className="text-3xl font-bold text-red-400">{stats?.bot_detections || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-400 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="users" data-testid="users-tab" className="data-[state=active]:bg-indigo-500/20">Users</TabsTrigger>
            <TabsTrigger value="domains" data-testid="domains-tab" className="data-[state=active]:bg-indigo-500/20">Domains</TabsTrigger>
            <TabsTrigger value="activity" data-testid="activity-tab" className="data-[state=active]:bg-indigo-500/20">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card className="glass-effect p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>All Users</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full" data-testid="users-table">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Super Admin</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`user-row-${idx}`}>
                        <td className="py-3 px-4">{u.email}</td>
                        <td className="py-3 px-4">
                          {u.is_super_admin ? (
                            <span className="text-red-400 font-semibold">Yes</span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            data-testid="view-activity-btn"
                            size="sm"
                            onClick={() => fetchUserActivity(u.id)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            View Activity
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* User Activity Detail */}
            {userActivity && (
              <Card className="glass-effect p-6 mt-6" data-testid="user-activity-detail">
                <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
                  Activity for {userActivity.user.email}
                </h3>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Domains</p>
                    <p className="text-2xl font-bold">{userActivity.domains.length}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Recent Logs</p>
                    <p className="text-2xl font-bold">{userActivity.recent_logs.length}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">API Keys</p>
                    <p className="text-2xl font-bold">{userActivity.api_keys.length}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Domains</h4>
                    <div className="space-y-2">
                      {userActivity.domains.map((d) => (
                        <div key={d.id} className="bg-white/5 p-3 rounded flex items-center justify-between">
                          <span>{d.domain}</span>
                          <span className={d.is_verified ? 'text-green-400' : 'text-yellow-400'}>
                            {d.is_verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Domains Tab */}
          <TabsContent value="domains" className="mt-6">
            <Card className="glass-effect p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>All Domains</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full" data-testid="domains-table">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Domain</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((d, idx) => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`domain-row-${idx}`}>
                        <td className="py-3 px-4 font-medium">{d.domain}</td>
                        <td className="py-3 px-4 text-sm text-gray-400">{d.user_email}</td>
                        <td className="py-3 px-4">
                          {d.is_verified ? (
                            <span className="text-green-400">Verified</span>
                          ) : (
                            <span className="text-yellow-400">Unverified</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(d.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <Card className="glass-effect p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Recent System Activity</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full" data-testid="activity-table">
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
                    {stats?.recent_activity?.map((log, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5" data-testid={`activity-row-${idx}`}>
                        <td className="py-3 px-4 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm font-mono">{log.ip_address}</td>
                        <td className="py-3 px-4 text-sm">
                          {log.detected_bot ? (
                            <span className="text-red-400">{log.detected_bot}</span>
                          ) : (
                            <span className="text-gray-500">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm capitalize ${
                            log.risk_level === 'high' ? 'text-red-400' :
                            log.risk_level === 'medium' ? 'text-yellow-400' :
                            log.risk_level === 'low' ? 'text-green-400' :
                            'text-gray-400'
                          }`}>
                            {log.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">{log.request_path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
