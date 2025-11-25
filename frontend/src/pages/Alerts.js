import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthToken } from '@/App';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Bell, Plus, Trash2, Mail, Webhook } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    alert_type: 'email',
    destination: '',
    threshold: 10
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/alerts`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setAlerts(response.data);
    } catch (error) {
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!formData.destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }

    if (formData.threshold < 1) {
      toast.error('Threshold must be at least 1');
      return;
    }

    try {
      await axios.post(`${API}/alerts`, formData, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      toast.success('Alert created');
      setFormData({ alert_type: 'email', destination: '', threshold: 10 });
      setIsDialogOpen(false);
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to create alert');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;

    try {
      await axios.delete(`${API}/alerts/${alertId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      toast.success('Alert deleted');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="alerts-title">
              Alerts
            </h1>
            <p className="text-gray-400">Configure notifications for bot detections</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-alert-btn" className="bg-gradient-to-r from-indigo-500 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Alert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-gray-300 mb-2">Alert Type</Label>
                  <Select
                    value={formData.alert_type}
                    onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
                  >
                    <SelectTrigger data-testid="alert-type-select" className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      <SelectItem value="email" className="text-white">Email</SelectItem>
                      <SelectItem value="webhook" className="text-white">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2">
                    {formData.alert_type === 'email' ? 'Email Address' : 'Webhook URL'}
                  </Label>
                  <Input
                    data-testid="alert-destination-input"
                    placeholder={formData.alert_type === 'email' ? 'your@email.com' : 'https://your-webhook-url.com'}
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2">Threshold (bot detections per hour)</Label>
                  <Input
                    data-testid="alert-threshold-input"
                    type="number"
                    min="1"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 1 })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <Button
                  data-testid="submit-alert-btn"
                  onClick={handleCreateAlert}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  Create Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <Card className="glass-effect p-12 text-center">
            <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No alerts configured</h3>
            <p className="text-gray-400 mb-6">Create your first alert to get notified about bot activity</p>
            <Button
              data-testid="empty-create-alert-btn"
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4" data-testid="alerts-list">
            {alerts.map((alert) => (
              <Card key={alert.id} className="glass-effect p-6" data-testid={`alert-card-${alert.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {alert.alert_type === 'email' ? (
                        <Mail className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <Webhook className="w-5 h-5 text-purple-400" />
                      )}
                      <h3 className="text-lg font-semibold capitalize">{alert.alert_type} Alert</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        alert.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {alert.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-400">Destination:</span>{' '}
                        <span className="text-white font-mono">{alert.destination}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Threshold:</span>{' '}
                        <span className="text-white font-semibold">{alert.threshold} bot detections per hour</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Created: {new Date(alert.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    data-testid="delete-alert-btn"
                    variant="ghost"
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
