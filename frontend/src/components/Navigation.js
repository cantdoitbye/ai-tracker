import { useNavigate, useLocation } from 'react-router-dom';
import { getUser, removeAuthToken, removeUser } from '@/App';
import { Button } from '@/components/ui/button';
import { Shield, LayoutDashboard, Globe, Activity, Key, Bell, UserCog, LogOut } from 'lucide-react';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    removeAuthToken();
    removeUser();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { path: '/domains', icon: <Globe className="w-5 h-5" />, label: 'Domains' },
    { path: '/traffic', icon: <Activity className="w-5 h-5" />, label: 'Traffic Logs' },
    { path: '/api-keys', icon: <Key className="w-5 h-5" />, label: 'API Keys' },
    { path: '/alerts', icon: <Bell className="w-5 h-5" />, label: 'Alerts' },
  ];

  if (user?.is_super_admin) {
    navItems.push({ path: '/admin', icon: <UserCog className="w-5 h-5" />, label: 'Super Admin' });
  }

  return (
    <div className="bg-[#0f0f23] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <Shield className="w-6 h-6 text-indigo-400" />
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>AIBot Detect</span>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-2 ${
                    location.pathname === item.path
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {user?.email}
            </div>
            <Button
              data-testid="logout-btn"
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
