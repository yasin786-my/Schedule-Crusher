import { useEffect, useState, useMemo } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { DockNav } from '../components/layout/DockNav';
import { BlurText } from '../components/reactbits/BlurText';
import { GlowBorder } from '../components/reactbits/GlowBorder';
import { TiltedCard } from '../components/reactbits/TiltedCard';
import client from '../api/client';
import { Link } from 'react-router-dom';
import { calcScheduleStats, formatDate } from '../utils/formatters';
import { Trash2, Calendar, CheckSquare, BarChart2, Plus } from 'lucide-react';
import { Toast } from '../components/common/Toast';

interface ScheduleSummary {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  units?: { tasks?: { status: string }[] }[];
}

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; show: boolean }>({
    message: '', type: 'success', show: false,
  });

  const fetchSchedules = () => {
    setLoading(true);
    client.get('/schedules')
      .then((res) => setSchedules(res.data.schedules || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSchedules(); }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this schedule? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await client.delete(`/schedules/${id}`);
      setSchedules(prev => prev.filter(s => s.id !== id));
      setToast({ message: 'Schedule deleted', type: 'success', show: true });
    } catch {
      setToast({ message: 'Failed to delete', type: 'error', show: true });
    } finally {
      setDeletingId(null);
    }
  };

  const activeTasks = useMemo(() =>
    schedules.reduce((sum, s) => sum + calcScheduleStats(s).pending, 0),
    [schedules]
  );

  const avgCompletion = useMemo(() => {
    if (!schedules.length) return 0;
    return Math.round(schedules.reduce((sum, s) => sum + calcScheduleStats(s).pct, 0) / schedules.length);
  }, [schedules]);

  const completedSchedules = schedules.filter(s => calcScheduleStats(s).pct === 100);
  const activeSchedules = schedules.filter(s => s.status === 'active');
  const archivedSchedules = schedules.filter(s => s.status !== 'active');

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-8">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <BlurText text="Welcome back!" className="text-3xl font-bold mb-2" delay={50} />
          <p className="text-surface-400">Here's your study overview for today.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlowBorder>
            <div className="p-5 h-full flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2 text-surface-400 text-sm font-medium">
                <Calendar size={14} /> Total Schedules
              </div>
              <p className="text-3xl font-bold mt-1">{schedules.length}</p>
            </div>
          </GlowBorder>
          <GlowBorder>
            <div className="p-5 h-full flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2 text-surface-400 text-sm font-medium">
                <CheckSquare size={14} /> Pending Tasks
              </div>
              <p className="text-3xl font-bold mt-1">{activeTasks}</p>
            </div>
          </GlowBorder>
          <GlowBorder>
            <div className="p-5 h-full flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2 text-surface-400 text-sm font-medium">
                <BarChart2 size={14} /> Avg Completion
              </div>
              <p className="text-3xl font-bold mt-1">{avgCompletion}%</p>
            </div>
          </GlowBorder>
          <GlowBorder className="col-span-2 md:col-span-1 bg-gradient-to-br from-primary-900/50 to-surface-900">
            <div className="p-5 h-full flex flex-col justify-center items-start">
              <h3 className="text-surface-200 text-base font-semibold mb-1">New Plan</h3>
              <p className="text-xs text-surface-400 mb-3">ISM-optimized study schedule</p>
              <Link
                to="/planner"
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-500/20"
              >
                <Plus size={14} /> Create
              </Link>
            </div>
          </GlowBorder>
        </div>

        {/* Active schedules */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 rounded bg-accent-500 block" /> Active Schedules
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-48 bg-surface-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeSchedules.length === 0 ? (
            <div className="text-center py-16 bg-surface-900/30 rounded-2xl border border-surface-800 border-dashed">
              <p className="text-surface-500 mb-4">No active schedules. Create one to get started!</p>
              <Link to="/planner" className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors">
                + New Schedule
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSchedules.map((schedule) => {
                const stats = calcScheduleStats(schedule);
                return (
                  <TiltedCard key={schedule.id}>
                    <Link to={`/schedule/${schedule.id}`} className="block h-full bg-surface-900 p-6 border border-surface-700/50 relative group">
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(schedule.id, e)}
                        disabled={deletingId === schedule.id}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete schedule"
                      >
                        {deletingId === schedule.id
                          ? <span className="animate-spin block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                          : <Trash2 size={14} />
                        }
                      </button>

                      <div className="flex justify-between items-start mb-3 pr-6">
                        <h3 className="font-bold text-base leading-snug truncate">{schedule.title}</h3>
                      </div>
                      <p className="text-xs text-surface-400 mb-1">
                        {formatDate(schedule.start_date)} → {formatDate(schedule.end_date)}
                      </p>
                      <p className="text-xs text-surface-500 mb-5">
                        {stats.completed}/{stats.total} tasks done
                      </p>

                      <div className="w-full bg-surface-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-accent-500 h-full transition-all"
                          style={{ width: `${stats.pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          stats.pct === 100
                            ? 'bg-green-500/20 text-green-400 border-green-500/20'
                            : 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                        }`}>
                          {stats.pct === 100 ? '✓ Complete' : 'active'}
                        </span>
                        <p className="text-xs text-surface-500">{stats.pct}%</p>
                      </div>
                    </Link>
                  </TiltedCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed schedules */}
        {completedSchedules.length > 0 && (
          <details className="mt-8">
            <summary className="text-lg font-bold cursor-pointer text-surface-400 hover:text-white select-none">
              ✓ Completed ({completedSchedules.length})
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {completedSchedules.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-4 bg-surface-900/50 rounded-xl border border-surface-800 hover:border-surface-600 group relative">
                  <Link to={`/schedule/${s.id}`} className="flex-1 min-w-0">
                    <p className="font-medium truncate text-surface-300">{s.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{formatDate(s.start_date)} → {formatDate(s.end_date)}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(s.id, e)}
                    className="p-1 text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Archived schedules */}
        {archivedSchedules.filter(s => calcScheduleStats(s).pct < 100).length > 0 && (
          <details className="mt-4">
            <summary className="text-lg font-bold cursor-pointer text-surface-400 hover:text-white select-none">
              Archived ({archivedSchedules.filter(s => calcScheduleStats(s).pct < 100).length})
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {archivedSchedules.filter(s => calcScheduleStats(s).pct < 100).map((s) => (
                <Link key={s.id} to={`/schedule/${s.id}`} className="p-4 bg-surface-900/50 rounded-xl border border-surface-800 hover:border-surface-600">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="text-xs text-surface-500 mt-1">{s.status}</p>
                </Link>
              ))}
            </div>
          </details>
        )}
      </main>
      <DockNav />
      <Toast message={toast.message} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} />
    </div>
  );
}
