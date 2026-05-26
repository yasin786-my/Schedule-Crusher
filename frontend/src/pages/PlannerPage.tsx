import React, { useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { BlurText } from '../components/reactbits/BlurText';
import { UnitForm, type UnitData } from '../components/schedule/UnitForm';
import { AU_SUBJECTS } from '../data/annaUniversity';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ShinyText } from '../components/reactbits/ShinyText';
import { Toast } from '../components/common/Toast';
import { getUnitColor } from '../utils/formatters';

export default function PlannerPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success', show: boolean }>({ message: '', type: 'error', show: false });
  const [units, setUnits] = useState<UnitData[]>([
    { name: '', importance: 5, total_points: 20 },
    { name: '', importance: 5, total_points: 20 },
    { name: '', importance: 5, total_points: 20 },
    { name: '', importance: 5, total_points: 20 },
    { name: '', importance: 5, total_points: 20 },
  ]);

  const handleUnitChange = (index: number, field: keyof UnitData, value: string | number) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  const applyPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (!code) return;
    const preset = AU_SUBJECTS.find(s => s.code === code);
    if (preset) {
      setTitle(`${preset.code} - ${preset.name} Prep`);
      const newUnits = preset.units.map((name) => ({ name, importance: 5, total_points: 20 }));
      while (newUnits.length < 5) newUnits.push({ name: '', importance: 5, total_points: 20 });
      setUnits(newUnits.slice(0, 5));
    }
  };

  // Validation
  const filledUnits = units.filter(u => u.name.trim());
  const weightedTotal = filledUnits.reduce((sum, u) => sum + u.importance * u.total_points, 0);

  const totalDays = startDate && endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
    : 0;

  const totalTasks = filledUnits.reduce((sum, u) => sum + u.total_points, 0);
  const tasksPerDay = totalDays > 0 ? (totalTasks / totalDays).toFixed(1) : '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filledUnits.length === 0) {
      setToast({ message: 'Add at least one unit', type: 'error', show: true });
      return;
    }
    if (totalDays <= 0) {
      setToast({ message: 'End date must be after start date', type: 'error', show: true });
      return;
    }
    setLoading(true);
    try {
      const payload = { title, start_date: startDate, end_date: endDate, units: filledUnits };
      const res = await client.post('/generate-schedule', payload);
      setToast({ message: 'Schedule created!', type: 'success', show: true });
      setTimeout(() => navigate(`/schedule/${res.data.schedule.id}`), 800);
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'Failed to generate', type: 'error', show: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <BlurText text="Create Schedule" className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400" delay={50} />
          <p className="text-surface-400">Configure your study plan and let the ISM algorithm optimize it.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-surface-900/50 p-6 rounded-2xl border border-surface-200/10 shadow-xl backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm border border-primary-500/50">1</span>
              Basic Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Schedule Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-950 border border-surface-700 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                  placeholder="E.g., Semester 4 Finals"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-950 border border-surface-700 rounded-lg focus:outline-none focus:border-primary-500 text-white [color-scheme:dark]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">End Date (Exam Day)</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-950 border border-surface-700 rounded-lg focus:outline-none focus:border-primary-500 text-white [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
              {/* Quick info row */}
              {totalDays > 0 && (
                <div className="flex gap-4 text-xs text-surface-400 pt-1">
                  <span>📅 {totalDays} day{totalDays !== 1 ? 's' : ''}</span>
                  <span>📚 {totalTasks} total tasks</span>
                  <span>⚡ ~{tasksPerDay} tasks/day</span>
                </div>
              )}
            </div>
          </div>

          {/* Units */}
          <div className="bg-surface-900/50 p-6 rounded-2xl border border-surface-200/10 shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm border border-primary-500/50">2</span>
                Syllabus & Units
              </h3>
              <select
                onChange={applyPreset}
                className="px-3 py-1.5 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-primary-500"
              >
                <option value="">-- Load AU Preset --</option>
                {AU_SUBJECTS.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {units.map((unit, idx) => (
                <UnitForm key={idx} index={idx} unit={unit} onChange={handleUnitChange} />
              ))}
            </div>
          </div>

          {/* Time distribution preview */}
          {filledUnits.length > 0 && (
            <div className="bg-surface-900/50 p-6 rounded-2xl border border-surface-200/10 shadow-xl backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm border border-primary-500/50">3</span>
                Time Distribution Preview
              </h3>
              <div className="space-y-3">
                {filledUnits.map((unit, idx) => {
                  const weight = unit.importance * unit.total_points;
                  const pct = weightedTotal ? Math.round((weight / weightedTotal) * 100) : 0;
                  const color = getUnitColor(idx);
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate text-surface-200">{unit.name}</span>
                        <span className="text-surface-400 shrink-0 ml-2">{pct}% · {unit.total_points} pts · imp {unit.importance}</span>
                      </div>
                      <div className="w-full bg-surface-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.5 + unit.importance * 0.05 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] transition-all disabled:opacity-50 text-lg flex items-center gap-3"
            >
              {loading
                ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                : <ShinyText text="Generate Smart Schedule" />
              }
            </button>
          </div>
        </form>
      </main>

      <Toast message={toast.message} type={toast.type} isVisible={toast.show} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
    </div>
  );
}
