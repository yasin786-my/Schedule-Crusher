export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Returns end time string given a start time + duration in minutes */
export function formatEndTime(startTime: string, durationMin: number): string {
  if (!startTime) return '';
  const [h, m] = startTime.split(':').map(Number);
  const endMin = h * 60 + m + durationMin;
  const eh = Math.floor(endMin / 60) % 24;
  const em = endMin % 60;
  return formatTime(`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`);
}

export function calcScheduleStats(schedule: {
  units?: { tasks?: { status: string }[] }[];
}) {
  const tasks = schedule.units?.flatMap((u) => u.tasks || []) || [];
  const studyTasks = tasks.filter((t) => t.status !== 'break');
  const total = studyTasks.length;
  const completed = studyTasks.filter((t) => t.status === 'completed').length;
  const pending = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, pct };
}

export function getUnitColor(index: number): string {
  const colors = [
    '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ef4444', '#22c55e', '#3b82f6', '#a855f7',
  ];
  return colors[index % colors.length];
}

/** Human-friendly duration: "1h 30m" or "45m" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
