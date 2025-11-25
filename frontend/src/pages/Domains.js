import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, getAuthToken } from '@/App';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Plus, CheckCircle, XCircle, Trash2, Copy } from 'lucide-react';

export default function Domains() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/domains`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setDomains(response.data);
    } catch (error) {
      toast.error('Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    try {
      await axios.post(
        `${API}/domains`,
        { domain: newDomain },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      toast.success('Domain added successfully');
      setNewDomain('');
      setIsDialogOpen(false);
      fetchDomains();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add domain');
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      const response = await axios.post(
        `${API}/domains/${domainId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      
      if (response.data.verified) {
        toast.success(`Domain verified via ${response.data.method}!`);
        fetchDomains();
      } else {
        toast.error(response.data.message || 'Verification failed');
      }
    } catch (error) {
      toast.error('Verification failed');
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (!window.confirm('Are you sure you want to delete this domain?')) return;

    try {
      await axios.delete(`${API}/domains/${domainId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      toast.success('Domain deleted');
      fetchDomains();
    } catch (error) {
      toast.error('Failed to delete domain');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="domains-title">
              Domains
            </h1>
            <p className="text-gray-400">Manage and verify your domains</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-domain-btn" className="bg-gradient-to-r from-indigo-500 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Domain</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  data-testid="domain-input"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button
                  data-testid="submit-domain-btn"
                  onClick={handleAddDomain}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  Add Domain
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading domains...</div>
        ) : domains.length === 0 ? (
          <Card className="glass-effect p-12 text-center">
            <Globe className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No domains added yet</h3>
            <p className="text-gray-400 mb-6">Add your first domain to start monitoring</p>
            <Button
              data-testid="empty-add-domain-btn"
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6" data-testid="domains-list">
            {domains.map((domain) => (
              <Card key={domain.id} className="glass-effect p-6" data-testid={`domain-card-${domain.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <Globe className="w-6 h-6 text-indigo-400" />
                      <h3 className="text-xl font-semibold">{domain.domain}</h3>
                      {domain.is_verified ? (
                        <span className="flex items-center space-x-1 text-green-400 text-sm" data-testid="verified-badge">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-yellow-400 text-sm" data-testid="unverified-badge">
                          <XCircle className="w-4 h-4" />
                          <span>Unverified</span>
                        </span>
                      )}
                    </div>

                    {!domain.is_verified && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold mb-3 text-yellow-400">Verification Required</h4>
                        <p className="text-sm text-gray-400 mb-3">Choose one of the following methods:</p>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Method 1: DNS TXT Record</p>
                            <div className="bg-black/30 p-3 rounded font-mono text-sm">
                              <div className="flex items-center justify-between">
                                <span>aibot-detect={domain.verification_token}</span>
                                <Button
                                  data-testid="copy-dns-btn"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(`aibot-detect=${domain.verification_token}`)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Method 2: File Upload</p>
                            <p className="text-sm text-gray-400 mb-2">
                              Upload a file to: <code className="bg-black/30 px-2 py-1 rounded">https://{domain.domain}/.well-known/aibot-detect.txt</code>
                            </p>
                            <div className="bg-black/30 p-3 rounded font-mono text-sm">
                              <div className="flex items-center justify-between">
                                <span>{domain.verification_token}</span>
                                <Button
                                  data-testid="copy-token-btn"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(domain.verification_token)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-400">
                      Added: {new Date(domain.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {!domain.is_verified && (
                      <Button
                        data-testid="verify-domain-btn"
                        onClick={() => handleVerifyDomain(domain.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Verify Now
                      </Button>
                    )}
                    <Button
                      data-testid="delete-domain-btn"
                      variant="ghost"
                      onClick={() => handleDeleteDomain(domain.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
