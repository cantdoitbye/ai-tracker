import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API, setAuthToken, setUser } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Mail, Lock } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/register`, { email, password });
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Get user info from Google
        const userInfoResponse = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );

        // Send to backend for authentication
        const response = await axios.post(`${API}/auth/google`, {
          token: tokenResponse.access_token,
          email: userInfoResponse.data.email,
          google_id: userInfoResponse.data.sub
        });

        setAuthToken(response.data.access_token);
        setUser(response.data.user);
        toast.success('Account created successfully!');
        navigate('/dashboard');
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Google signup failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error('Google signup failed');
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_70%)]" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Shield className="w-10 h-10 text-indigo-400" />
            <span className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>AI Tracker</span>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Create Account</h1>
          <p className="text-gray-400">Start monitoring AI bot traffic</p>
        </div>

        <div className="glass-effect p-8" data-testid="register-form">
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-gray-300 mb-2 flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </Label>
              <Input
                id="email"
                data-testid="register-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300 mb-2 flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Password</span>
              </Label>
              <Input
                id="password"
                data-testid="register-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300 mb-2 flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Confirm Password</span>
              </Label>
              <Input
                id="confirmPassword"
                data-testid="register-confirm-password-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              data-testid="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900/50 text-gray-400">OR</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignup}
            disabled={loading}
            variant="outline"
            className="w-full bg-white hover:bg-gray-100 text-gray-900 border-0"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </Button>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300" data-testid="login-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-gray-300" data-testid="back-home-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
