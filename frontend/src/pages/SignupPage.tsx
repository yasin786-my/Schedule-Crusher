import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Aurora } from '../components/reactbits/Aurora';
import { BlurText } from '../components/reactbits/BlurText';
import { Toast } from '../components/common/Toast';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, X } from 'lucide-react';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase',     ok: /[A-Z]/.test(password) },
    { label: 'Number',        ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-3 mt-1.5">
      {checks.map(c => (
        <span key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? 'text-green-400' : 'text-surface-500'}`}>
          {c.ok ? <Check size={10} /> : <X size={10} />} {c.label}
        </span>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; show: boolean }>({ message: '', type: 'error', show: false });
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({ message: "Passwords don't match", type: 'error', show: true });
      return;
    }
    if (password.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error', show: true });
      return;
    }
    setLoading(true);
    try {
      await signup(username, email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'Failed to sign up', type: 'error', show: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0"><Aurora speed={0.6} colorStops={['#8B5CF6', '#EC4899', '#3B82F6']} /></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-8 bg-surface-950/40 backdrop-blur-xl border border-surface-200/10 rounded-2xl shadow-2xl"
      >
        <div className="text-center mb-7">
          <BlurText text="Join Schedule Crusher" delay={80} className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-primary-400 mb-2" />
          <p className="text-surface-300 font-light">Create smarter study plans</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1">Username</label>
            <input type="text" required value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-900/50 border border-surface-200/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-white placeholder-surface-500"
              placeholder="Student123" autoComplete="username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1">Email</label>
            <input type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-900/50 border border-surface-200/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-white placeholder-surface-500"
              placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 bg-surface-900/50 border border-surface-200/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-white placeholder-surface-500"
                placeholder="••••••••" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1">Confirm Password</label>
            <input type="password" required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2.5 bg-surface-900/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-white placeholder-surface-500 ${
                confirmPassword && confirmPassword !== password ? 'border-red-500/50' : 'border-surface-200/10'
              }`}
              placeholder="••••••••" autoComplete="new-password" />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
            )}
          </div>

          <button type="submit" disabled={loading || (!!confirmPassword && confirmPassword !== password)}
            className="w-full py-3 px-4 mt-1 bg-accent-600 hover:bg-accent-500 text-white rounded-lg font-medium shadow-[0_0_15px_rgba(236,72,153,0.5)] hover:shadow-[0_0_25px_rgba(236,72,153,0.7)] transition-all disabled:opacity-50 flex justify-center items-center">
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Sign Up'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-surface-400">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-400 hover:text-accent-300 font-medium">Log in</Link>
        </p>
      </motion.div>

      <Toast message={toast.message} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} />
    </div>
  );
}
