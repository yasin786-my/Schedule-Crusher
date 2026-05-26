import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { DockNav } from '../components/layout/DockNav';
import { BlurText } from '../components/reactbits/BlurText';
import { Toast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Clock, Coffee, Brain, User, LogOut } from 'lucide-react';

interface Settings {
  work_start_hour: number;
  work_end_hour: number;
  break_duration: number;
  work_block_duration: number;
  lunch_break_start: number;
  lunch_break_duration: number;
  ai_aggressiveness: 'low' | 'medium' | 'high';
}

const defaults: Settings = {
  work_start_hour: 8,
  work_end_hour: 21,
  break_duration: 15,
  work_block_duration: 90,
  lunch_break_start: 13,
  lunch_break_duration: 30,
  ai_aggressiveness: 'medium',
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-900/50 p-6 rounded-2xl border border-surface-200/10">
      <h3 className="font-bold mb-5 flex items-center gap-2 text-surface-100">
        <span className="text-primary-400">{icon}</span> {title}
      </h3>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; show: boolean }>({
    message: '', type: 'error', show: false,
  });

  useEffect(() => {
    client.get('/settings')
      .then((res) => setSettings({ ...defaults, ...res.data.settings }))
      .catch(() => setToast({ message: 'Failed to load settings', type: 'error', show: true }))
      .finally(() => setLoading(false));
  }, []);

  const set = (patch: Partial<Settings>) => setSettings(prev => ({ ...prev, ...patch }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (settings.work_start_hour >= settings.work_end_hour) {
      setToast({ message: 'Start hour must be before end hour', type: 'error', show: true });
      return;
    }
    setSaving(true);
    try {
      const res = await client.put('/settings', settings);
      setSettings(res.data.settings);
      setToast({ message: 'Settings saved!', type: 'success', show: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed';
      setToast({ message: msg, type: 'error', show: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-surface-900/50 rounded-2xl animate-pulse" />)}
        </main>
      </div>
    );
  }

  const totalStudyHours = settings.work_end_hour - settings.work_start_hour
    - settings.lunch_break_duration / 60;

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-8">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <BlurText text="Settings" className="text-3xl font-bold mb-1" delay={50} />
        <p className="text-surface-400 mb-8">Customize your study schedule preferences.</p>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Work Hours */}
          <Section icon={<Clock size={16} />} title="Work Hours">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-sm text-surface-400">Start Hour</span>
                <input
                  type="number" min={0} max={22}
                  value={settings.work_start_hour}
                  onChange={(e) => set({ work_start_hour: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-surface-950 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-surface-400">End Hour</span>
                <input
                  type="number" min={1} max={24}
                  value={settings.work_end_hour}
                  onChange={(e) => set({ work_end_hour: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-surface-950 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </label>
            </div>
            <p className="text-xs text-surface-500">
              ≈ {totalStudyHours.toFixed(1)} effective study hours/day (after lunch)
            </p>
          </Section>

          {/* Lunch */}
          <Section icon={<span>🍽️</span>} title="Lunch Break">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-surface-400">Lunch at (hour)</span>
                <input
                  type="number" min={10} max={16}
                  value={settings.lunch_break_start}
                  onChange={(e) => set({ lunch_break_start: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-surface-950 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-surface-400">Duration: {settings.lunch_break_duration} min</span>
                <input
                  type="range" min={15} max={60} step={5}
                  value={settings.lunch_break_duration}
                  onChange={(e) => set({ lunch_break_duration: +e.target.value })}
                  className="w-full mt-3 accent-primary-500"
                />
              </label>
            </div>
          </Section>

          {/* Break Rules */}
          <Section icon={<Coffee size={16} />} title="Break Rules">
            <div className="space-y-5">
              <label className="block">
                <div className="flex justify-between text-sm text-surface-400 mb-1">
                  <span>Work block before break</span>
                  <span className="font-bold text-white">{settings.work_block_duration} min</span>
                </div>
                <input
                  type="range" min={30} max={120} step={15}
                  value={settings.work_block_duration}
                  onChange={(e) => set({ work_block_duration: +e.target.value })}
                  className="w-full accent-primary-500"
                />
              </label>
              <label className="block">
                <div className="flex justify-between text-sm text-surface-400 mb-1">
                  <span>Break duration</span>
                  <span className="font-bold text-white">{settings.break_duration} min</span>
                </div>
                <input
                  type="range" min={5} max={30} step={5}
                  value={settings.break_duration}
                  onChange={(e) => set({ break_duration: +e.target.value })}
                  className="w-full accent-primary-500"
                />
              </label>
            </div>
          </Section>

          {/* AI Aggressiveness */}
          <Section icon={<Brain size={16} />} title="AI Fatigue Adjustment">
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => set({ ai_aggressiveness: level })}
                  className={`flex-1 py-2.5 rounded-xl capitalize text-sm font-medium transition-all ${
                    settings.ai_aggressiveness === level
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                      : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-surface-500 mt-3">
              {settings.ai_aggressiveness === 'low' && 'Gentle pacing — more breaks, lighter daily load.'}
              {settings.ai_aggressiveness === 'medium' && 'Balanced — recommended for most exam preps.'}
              {settings.ai_aggressiveness === 'high' && 'Intensive — fewer breaks, max coverage per day.'}
            </p>
          </Section>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : null}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        {/* Account */}
        <section className="mt-6 bg-surface-900/50 p-6 rounded-2xl border border-surface-200/10">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-surface-100">
            <User size={16} className="text-primary-400" /> Account
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user?.username}</p>
              <p className="text-sm text-surface-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </section>
      </main>
      <DockNav />
      <Toast message={toast.message} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} />
    </div>
  );
}
