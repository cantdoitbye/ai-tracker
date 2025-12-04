import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthToken } from '@/App';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Key, Plus, Copy, Trash2, Code } from 'lucide-react';

export default function ApiKeys() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api-keys`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setApiKeys(response.data);
    } catch (error) {
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    try {
      await axios.post(
        `${API}/api-keys`,
        { name: newKeyName },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      toast.success('API key created');
      setNewKeyName('');
      setIsDialogOpen(false);
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;

    try {
      await axios.delete(`${API}/api-keys/${keyId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      toast.success('API key deleted');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const integrationCode = (apiKey, domain) => {
    // Get the backend URL from environment variable
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api`;
    
    return `
<!-- Add this script to your website -->
<script>
(function() {
  const API_KEY = '${apiKey}';
  const DOMAIN = '${domain}';
  const API_URL = '${apiUrl}';

  // Log page view
  fetch(API_URL + '/traffic/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: DOMAIN,
      api_key: API_KEY,
      ip_address: '', // Will be captured on backend
      user_agent: navigator.userAgent,
      request_path: window.location.pathname,
      request_method: 'GET'
    })
  });
})();
</script>`;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="api-keys-title">
              API Keys
            </h1>
            <p className="text-gray-400">Manage API keys for tracking integration</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              data-testid="integration-guide-btn"
              onClick={() => setShowIntegration(!showIntegration)}
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              <Code className="w-4 h-4 mr-2" />
              Integration Guide
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-api-key-btn" className="bg-gradient-to-r from-indigo-500 to-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a2e] border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    data-testid="api-key-name-input"
                    placeholder="Key name (e.g., Production, Chrome Extension)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button
                    data-testid="submit-api-key-btn"
                    onClick={handleCreateKey}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    Create Key
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Integration Guide */}
        {showIntegration && (
          <Card className="glass-effect p-6 mb-6" data-testid="integration-guide">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Integration Guide
            </h3>
            <div className="space-y-4">
              <p className="text-gray-400">
                Add the tracking script to your website to start monitoring AI bot traffic. Replace <code className="bg-black/30 px-2 py-1 rounded">YOUR_API_KEY</code> and <code className="bg-black/30 px-2 py-1 rounded">YOUR_DOMAIN</code> with your actual values.
              </p>
              <div className="bg-black/30 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{integrationCode('YOUR_API_KEY', 'YOUR_DOMAIN')}</pre>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading API keys...</div>
        ) : apiKeys.length === 0 ? (
          <Card className="glass-effect p-12 text-center">
            <Key className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No API keys yet</h3>
            <p className="text-gray-400 mb-6">Create your first API key to start tracking</p>
            <Button
              data-testid="empty-create-key-btn"
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4" data-testid="api-keys-list">
            {apiKeys.map((key) => (
              <Card key={key.id} className="glass-effect p-6" data-testid={`api-key-card-${key.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Key className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-lg font-semibold">{key.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        key.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <code className="bg-black/30 px-3 py-2 rounded font-mono text-sm">{key.key}</code>
                      <Button
                        data-testid="copy-api-key-btn"
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(key.key)}
                        className="hover:bg-white/5"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                      Created: {new Date(key.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    data-testid="delete-api-key-btn"
                    variant="ghost"
                    onClick={() => handleDeleteKey(key.id)}
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
