import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Aurora } from '../components/reactbits/Aurora';
import { BlurText } from '../components/reactbits/BlurText';
import { Toast } from '../components/common/Toast';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; show: boolean }>({ message: '', type: 'error', show: false });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'Invalid email or password', type: 'error', show: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0"><Aurora speed={0.8} /></div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-8 bg-surface-950/40 backdrop-blur-xl border border-surface-200/10 rounded-2xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <BlurText text="Schedule Crusher" delay={100} className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400 mb-2" />
          <p className="text-surface-300 font-light">ISM Academic Planner</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1">Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface-900/50 border border-surface-200/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-surface-500 transition-all"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 bg-surface-900/50 border border-surface-200/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-surface-500 transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.7)] transition-all disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">Sign up</Link>
        </p>
      </motion.div>

      <Toast message={toast.message} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} />
    </div>
  );
}
