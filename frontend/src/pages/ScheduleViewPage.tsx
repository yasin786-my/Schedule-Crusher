import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, RefreshCw, CheckCircle2, Circle } from 'lucide-react';
import client from '../api/client';
import { Navbar } from '../components/layout/Navbar';
import { DockNav } from '../components/layout/DockNav';
import { BlurText } from '../components/reactbits/BlurText';
import { AnimatedList } from '../components/reactbits/AnimatedList';
import { Toast } from '../components/common/Toast';
import { formatDate, formatTime, formatEndTime, formatDuration, calcScheduleStats, getUnitColor } from '../utils/formatters';
import { exportSchedulePdf } from '../utils/pdfExport';

interface Task {
  id: number;
  description: string;
  scheduled_date: string;
  scheduled_start_time: string;
  planned_duration: number;
  status: string;
  unit_id: number;
}

interface Unit {
  id: number;
  name: string;
  tasks?: Task[];
}

interface Schedule {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  units?: Unit[];
  breaks?: Task[];   // top-level breaks (backend may store here)
}

type DayTask = Task & { unitName: string; unitIndex: number };

function getAllDates(schedule: Schedule): string[] {
  const dates = new Set<string>();
  schedule.units?.forEach((u) => u.tasks?.forEach((t) => dates.add(t.scheduled_date)));
  schedule.breaks?.forEach((t) => dates.add(t.scheduled_date));
  return [...dates].sort();
}

// ── Fix: re-slot tasks sequentially when backend assigns duplicate start times ──
function resolveTimingConflicts(tasks: DayTask[]): DayTask[] {
  const times = tasks.map(t => t.scheduled_start_time);
  const hasDuplicates = times.some((t, i) => times.indexOf(t) !== i);
  if (!hasDuplicates) return tasks;

  const LUNCH_AT    = 13 * 60;
  const LUNCH_DUR   = 30;
  const SHORT_BREAK = 15;

  const breaks = tasks.filter(t => t.status === 'break');
  const study  = tasks.filter(t => t.status !== 'break');

  let cursor = 8 * 60; // 08:00
  let lunchInserted = breaks.some(b => b.description?.toLowerCase().includes('lunch'));
  let tasksStudied  = 0;
  const result: DayTask[] = [];

  const toHHMM = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;

  for (const task of study) {
    // Insert lunch at 13:00
    if (!lunchInserted && cursor < LUNCH_AT && cursor + task.planned_duration > LUNCH_AT) {
      result.push({
        ...task, id: -Date.now(), description: 'Lunch Break', status: 'break',
        unitName: '', unitIndex: -1, planned_duration: LUNCH_DUR,
        scheduled_start_time: toHHMM(LUNCH_AT),
      });
      cursor = LUNCH_AT + LUNCH_DUR;
      lunchInserted = true;
    }
    // Short break every 8 study tasks (~104 min)
    if (tasksStudied > 0 && tasksStudied % 8 === 0) {
      result.push({
        ...task, id: -(Date.now() + tasksStudied), description: 'Short Break',
        status: 'break', unitName: '', unitIndex: -1, planned_duration: SHORT_BREAK,
        scheduled_start_time: toHHMM(cursor),
      });
      cursor += SHORT_BREAK;
    }

    result.push({ ...task, scheduled_start_time: toHHMM(cursor) });
    cursor += task.planned_duration;
    tasksStudied++;
  }

  return result.sort((a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const color = pct === 100 ? '#22c55e' : '#6366f1';
  return (
    <div className="bg-surface-900/50 p-4 rounded-xl border border-surface-200/10 flex items-center justify-center">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#1e1e2e" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="16" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
      </div>
    </div>
  );
}

function UnitProgress({ schedule }: { schedule: Schedule }) {
  return (
    <div className="bg-surface-900/50 p-4 rounded-xl border border-surface-200/10 space-y-2 max-h-32 overflow-y-auto">
      {schedule.units?.map((u, i) => {
        const tasks = (u.tasks || []).filter((t) => t.status !== 'break');
        const done = tasks.filter((t) => t.status === 'completed').length;
        const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
        return (
          <div key={u.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="truncate text-surface-300">{u.name}</span>
              <span className="text-surface-500 ml-2 shrink-0">{done}/{tasks.length}</span>
            </div>
            <div className="w-full bg-surface-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: getUnitColor(i) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BreakRow({ task }: { task: DayTask }) {
  const isLunch = task.description?.toLowerCase().includes('lunch');
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${
      isLunch
        ? 'bg-amber-500/5 border-amber-500/20'
        : 'bg-surface-900/40 border-surface-700/30'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-base">{isLunch ? '🍽️' : '☕'}</span>
        <div>
          <span className={`text-sm font-medium ${isLunch ? 'text-amber-400' : 'text-surface-400'}`}>
            {isLunch ? 'Lunch Break' : 'Break'}
          </span>
          <p className="text-xs text-surface-600">{formatDuration(task.planned_duration)}</p>
        </div>
      </div>
      <div className="text-xs text-surface-500 text-right">
        <p>{formatTime(task.scheduled_start_time)}</p>
        <p className="text-surface-600">→ {formatEndTime(task.scheduled_start_time, task.planned_duration)}</p>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  unitColor,
  onToggle,
}: {
  task: DayTask;
  unitColor: string;
  onToggle: (t: Task, checked: boolean) => void;
}) {
  const done = task.status === 'completed';
  return (
    <>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(task, !done)}
          className="mt-0.5 shrink-0 text-surface-600 hover:text-primary-400 transition-colors"
        >
          {done
            ? <CheckCircle2 size={20} className="text-green-400" />
            : <Circle size={20} />
          }
        </button>
        <div className="min-w-0">
          <span className={`font-medium text-sm leading-snug ${done ? 'line-through text-surface-500' : 'text-surface-100'}`}>
            {task.description}
          </span>
          <p className="text-xs mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: unitColor }} />
            <span className="text-surface-500 truncate">{task.unitName}</span>
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className="text-xs font-medium text-primary-400">{formatTime(task.scheduled_start_time)}</p>
        <p className="text-xs text-surface-600">→ {formatEndTime(task.scheduled_start_time, task.planned_duration)}</p>
        <span className="mt-1 inline-block px-1.5 py-0.5 bg-surface-700 rounded text-xs text-surface-400">
          {formatDuration(task.planned_duration)}
        </span>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ScheduleViewPage() {
  const { id } = useParams();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'error' as 'error' | 'success', show: false });

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await client.get(`/schedules/${id}`);
      const data = res.data.schedule as Schedule;
      setSchedule(data);
      setSelectedDate((prev) => {
        const dates = getAllDates(data);
        return prev || dates[0] || '';
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const stats    = useMemo(() => schedule ? calcScheduleStats(schedule) : { total: 0, completed: 0, pending: 0, pct: 0 }, [schedule]);
  const allDates = useMemo(() => schedule ? getAllDates(schedule) : [], [schedule]);

  const dayTasks = useMemo((): DayTask[] => {
    if (!schedule || !selectedDate) return [];

    // Collect study tasks from units
    const fromUnits: DayTask[] = (
      schedule.units?.flatMap((u, idx) =>
        (u.tasks || []).map((t) => ({ ...t, unitName: u.name, unitIndex: idx }))
      ) || []
    ).filter((t) => t.scheduled_date === selectedDate);

    // FIX: also collect top-level breaks array (backend may store them here)
    const fromBreaks: DayTask[] = (
      (schedule.breaks || []).map((t) => ({ ...t, unitName: '', unitIndex: -1 }))
    ).filter((t) => t.scheduled_date === selectedDate);

    // Deduplicate breaks already embedded in unit tasks
    const existingBreakTimes = new Set(
      fromUnits.filter(t => t.status === 'break').map(t => t.scheduled_start_time)
    );
    const uniqueBreaks = fromBreaks.filter(b => !existingBreakTimes.has(b.scheduled_start_time));

    const merged = [...fromUnits, ...uniqueBreaks].sort(
      (a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time)
    );

    // FIX: resolve duplicate start times from parallel unit scheduling
    return resolveTimingConflicts(merged);
  }, [schedule, selectedDate]);

  // Day completion stats
  const dayStats = useMemo(() => {
    const study = dayTasks.filter(t => t.status !== 'break');
    const done  = study.filter(t => t.status === 'completed').length;
    return { total: study.length, done, pct: study.length ? Math.round(done / study.length * 100) : 0 };
  }, [dayTasks]);

  const handleToggleTask = async (task: Task, checked: boolean) => {
    // Optimistic update
    setSchedule(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        units: prev.units?.map(u => ({
          ...u,
          tasks: u.tasks?.map(t =>
            t.id === task.id ? { ...t, status: checked ? 'completed' : 'pending' } : t
          ),
        })),
      };
    });
    try {
      if (checked) {
        await client.post(`/tasks/${task.id}/complete`, { actual_duration: task.planned_duration });
      } else {
        await client.post(`/tasks/${task.id}/uncomplete`);
      }
      await fetchSchedule();
      setToast({ message: checked ? '✓ Task completed!' : 'Task reopened', type: 'success', show: true });
    } catch {
      await fetchSchedule(); // revert on failure
      setToast({ message: 'Failed to update task', type: 'error', show: true });
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await client.post(`/schedules/${id}/regenerate`);
      setSchedule(res.data.schedule);
      setToast({ message: 'Schedule regenerated!', type: 'success', show: true });
    } catch {
      setToast({ message: 'Regeneration failed', type: 'error', show: true });
    } finally {
      setRegenerating(false);
    }
  };

  const navigateDate = (dir: -1 | 1) => {
    const idx = allDates.indexOf(selectedDate);
    const next = allDates[idx + dir];
    if (next) setSelectedDate(next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-4">
          <div className="h-12 w-1/2 bg-surface-800 rounded-xl animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-surface-800 rounded-xl animate-pulse" />)}
          </div>
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-surface-800 rounded-lg animate-pulse" />)}
          </div>
        </main>
      </div>
    );
  }

  if (!schedule) {
    return <div className="min-h-screen pt-20 text-center">Schedule not found</div>;
  }

  const dateIdx = allDates.indexOf(selectedDate);

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-8">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <BlurText text={schedule.title} className="text-3xl font-bold mb-1" delay={50} />
            <p className="text-surface-400 text-sm">
              {formatDate(schedule.start_date)} — {formatDate(schedule.end_date)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportSchedulePdf(schedule)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-lg text-sm transition-colors"
            >
              <Download size={15} /> Export PDF
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 rounded-lg text-sm text-primary-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-900/50 p-4 rounded-xl border border-surface-200/10 text-center">
            <p className="text-3xl font-bold">{stats.pct}%</p>
            <p className="text-sm text-surface-400 mt-1">
              Overall ({stats.completed}/{stats.total} tasks)
            </p>
            <div className="w-full bg-surface-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 to-accent-500 h-full transition-all duration-500" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>
          <ProgressRing pct={stats.pct} />
          <UnitProgress schedule={schedule} />
        </div>

        {/* Day navigator */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => navigateDate(-1)}
            disabled={dateIdx === 0}
            className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold">{formatDate(selectedDate)}</h2>
            <p className="text-xs text-surface-500">{dayStats.done}/{dayStats.total} done today</p>
          </div>
          <button
            type="button"
            onClick={() => navigateDate(1)}
            disabled={dateIdx === allDates.length - 1}
            className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day progress bar */}
        <div className="w-full bg-surface-800 h-1 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
            style={{ width: `${dayStats.pct}%` }}
          />
        </div>

        {/* Task list */}
        <AnimatedList>
          {dayTasks.length === 0 ? (
            <p className="text-center py-12 text-surface-500">No tasks scheduled for this day.</p>
          ) : (
            dayTasks.map((task) => (
              task.status === 'break' ? (
                <div key={`break-${task.scheduled_start_time}`} className="mb-2">
                  <BreakRow task={task} />
                </div>
              ) : (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-lg border mb-2 transition-all ${
                    task.status === 'completed'
                      ? 'bg-surface-900/30 border-surface-700/30 opacity-70'
                      : 'bg-surface-800 border-surface-700/50 hover:border-surface-600'
                  }`}
                >
                  <TaskRow
                    task={task}
                    unitColor={getUnitColor(task.unitIndex)}
                    onToggle={handleToggleTask}
                  />
                </div>
              )
            ))
          )}
        </AnimatedList>
      </main>
      <DockNav />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast((p) => ({ ...p, show: false }))}
      />
    </div>
  );
}
