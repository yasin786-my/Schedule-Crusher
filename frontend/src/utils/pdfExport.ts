import jsPDF from 'jspdf';
import { formatDate, formatTime, calcScheduleStats } from './formatters';

interface PdfTask {
  description: string;
  scheduled_date: string;
  scheduled_start_time: string;
  planned_duration: number;
  status: string;           // 'pending' | 'completed' | 'break'
}

interface PdfUnit {
  name: string;
  tasks?: PdfTask[];
}

interface ScheduleForPdf {
  title: string;
  start_date: string;
  end_date: string;
  units?: PdfUnit[];
  breaks?: PdfTask[];       // top-level breaks array (backend may store here)
}

// ─── page constants ───────────────────────────────────────────────────────────
const PW       = 210;
const PH       = 297;
const M        = 14;
const CW       = PW - M * 2;
const SAFE_BOT = PH - 18;

// ─── colour palette ───────────────────────────────────────────────────────────
type RGB = [number, number, number];
const C = {
  bg:     [13,  13,  23 ] as RGB,
  card:   [22,  22,  38 ] as RGB,
  indigo: [99,  102, 241] as RGB,
  pink:   [236, 72,  153] as RGB,
  white:  [255, 255, 255] as RGB,
  muted:  [155, 155, 175] as RGB,
  dim:    [90,  90,  110] as RGB,
  green:  [74,  222, 128] as RGB,
  border: [38,  38,  58 ] as RGB,
  amber:  [245, 158, 11 ] as RGB,
  amberD: [30,  22,  6  ] as RGB,
  breakD: [18,  18,  28 ] as RGB,
  breakA: [65,  65,  90 ] as RGB,
};

const fill   = (d: jsPDF, c: RGB) => d.setFillColor  (c[0], c[1], c[2]);
const stroke = (d: jsPDF, c: RGB) => d.setDrawColor  (c[0], c[1], c[2]);
const color  = (d: jsPDF, c: RGB) => d.setTextColor  (c[0], c[1], c[2]);
const rrect  = (d: jsPDF, x: number, y: number, w: number, h: number, r: number, mode = 'F') =>
  d.roundedRect(x, y, w, h, r, r, mode);

function newPage(doc: jsPDF): number {
  doc.addPage();
  fill(doc, C.bg);
  doc.rect(0, 0, PW, PH, 'F');
  return M;
}

function guard(doc: jsPDF, y: number, need: number): number {
  return y + need > SAFE_BOT ? newPage(doc) : y;
}

function pbar(doc: jsPDF, x: number, y: number, w: number, h: number, pct: number) {
  fill(doc, C.border);
  rrect(doc, x, y, w, h, h / 2);
  if (pct > 0) {
    fill(doc, C.indigo);
    rrect(doc, x, y, Math.max(h, (w * pct) / 100), h, h / 2);
  }
}

/** Convert "HH:MM" or "HH:MM:SS" to total minutes since midnight */
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Add `delta` minutes to "HH:MM" string, returns "HH:MM" */
function addMinutes(t: string, delta: number): string {
  const total = toMinutes(t) + delta;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * FIX: Re-slot tasks sequentially when the backend assigns duplicate start times.
 *
 * The backend scheduler sometimes assigns the same start time to multiple tasks
 * (one per unit) instead of sequencing them. This function detects time
 * collisions and re-assigns start times so every task runs one after the other,
 * preserving the original order. Break tasks remain in place.
 *
 * Study day: 08:00 – 17:30 with a 30-min lunch at 13:00 inserted automatically
 * if none already exists in the data.
 */
function resolveTimingConflicts(
  tasks: Array<PdfTask & { unitName: string }>
): Array<PdfTask & { unitName: string }> {
  const STUDY_START   = '08:00';
  const LUNCH_AT      = 13 * 60;   // 13:00 in minutes
  const LUNCH_DUR     = 30;
  const SHORT_BREAK   = 15;        // gap every ~2 hours
  const STUDY_END_MIN = 17 * 60 + 30; // 17:30

  // Check if any collision exists
  const times = tasks.map(t => t.scheduled_start_time);
  const hasDuplicates = times.some((t, i) => times.indexOf(t) !== i);

  if (!hasDuplicates) return tasks; // already fine

  // Separate breaks (keep them, will be merged back)
  const breaks = tasks.filter(t => t.status === 'break');
  const study  = tasks.filter(t => t.status !== 'break');

  // Sort study tasks: preserve relative unit order, but sequence them
  // (stable sort already done by caller, so just re-number times)
  let cursor = toMinutes(STUDY_START);
  let tasksStudied = 0;
  let lunchInserted = breaks.some(b => b.description?.toLowerCase().includes('lunch'));

  const result: Array<PdfTask & { unitName: string }> = [];

  for (let i = 0; i < study.length; i++) {
    const task = study[i];

    // Insert lunch break at ~13:00 if not already present in break data
    if (!lunchInserted && cursor < LUNCH_AT && cursor + task.planned_duration > LUNCH_AT) {
      result.push({
        description: 'Lunch Break',
        scheduled_date: task.scheduled_date,
        scheduled_start_time: `${String(Math.floor(LUNCH_AT / 60)).padStart(2,'0')}:${String(LUNCH_AT % 60).padStart(2,'0')}`,
        planned_duration: LUNCH_DUR,
        status: 'break',
        unitName: '',
      });
      cursor = LUNCH_AT + LUNCH_DUR;
      lunchInserted = true;
    }

    // Short break every ~8 tasks (approx every 1h 44m at 13min/task)
    if (tasksStudied > 0 && tasksStudied % 8 === 0 && cursor < STUDY_END_MIN - SHORT_BREAK) {
      result.push({
        description: 'Short Break',
        scheduled_date: task.scheduled_date,
        scheduled_start_time: `${String(Math.floor(cursor / 60)).padStart(2,'0')}:${String(cursor % 60).padStart(2,'0')}`,
        planned_duration: SHORT_BREAK,
        status: 'break',
        unitName: '',
      });
      cursor += SHORT_BREAK;
    }

    // Also merge in any real break data that falls before this cursor point
    for (const brk of breaks) {
      const bMin = toMinutes(brk.scheduled_start_time);
      if (bMin >= cursor && bMin <= cursor + task.planned_duration) {
        // place break at cursor and advance
        result.push({ ...brk, scheduled_start_time: addMinutes(brk.scheduled_date + 'T00:00:00', cursor).slice(11,16) ?? brk.scheduled_start_time });
        cursor += brk.planned_duration;
      }
    }

    result.push({
      ...task,
      scheduled_start_time: `${String(Math.floor(cursor / 60)).padStart(2,'0')}:${String(cursor % 60).padStart(2,'0')}`,
    });

    cursor += task.planned_duration;
    tasksStudied++;
  }

  return result.sort((a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time));
}

// ─── main export ─────────────────────────────────────────────────────────────
export function exportSchedulePdf(schedule: ScheduleForPdf): void {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const stats = calcScheduleStats(schedule);

  // background page 1
  fill(doc, C.bg);
  doc.rect(0, 0, PW, PH, 'F');

  let y = M;

  // ── header card ─────────────────────────────────────────────────────────
  fill(doc, C.card);
  rrect(doc, M, y, CW, 42, 3);

  color(doc, C.indigo);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('SCHEDULE CRUSHER', M + 5, y + 8);

  color(doc, C.white);
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(schedule.title, CW - 10) as string[];
  doc.text(titleLines, M + 5, y + 17);

  color(doc, C.muted);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${formatDate(schedule.start_date)}  →  ${formatDate(schedule.end_date)}`, M + 5, y + 34);

  y += 50;

  // ── stats row ────────────────────────────────────────────────────────────
  const sw = (CW - 6) / 3;
  [
    { label: 'Study Tasks', value: String(stats.total)     },
    { label: 'Completed',   value: String(stats.completed) },
    { label: 'Progress',    value: `${stats.pct}%`         },
  ].forEach((item, i) => {
    const sx = M + i * (sw + 3);
    fill(doc, C.card);
    rrect(doc, sx, y, sw, 20, 2);
    color(doc, C.indigo);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(item.value, sx + sw / 2, y + 11, { align: 'center' });
    color(doc, C.muted);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(item.label, sx + sw / 2, y + 17, { align: 'center' });
  });

  y += 24;
  pbar(doc, M, y, CW, 3, stats.pct);
  y += 10;

  // ── collect all tasks per date ────────────────────────────────────────
  //
  // FIX 1: Also collect top-level `schedule.breaks[]` if the backend stores
  //         breaks outside of units (common pattern).
  //
  const byDate = new Map<string, Array<PdfTask & { unitName: string }>>();

  // Collect study tasks from units
  schedule.units?.forEach((unit) => {
    unit.tasks?.forEach((task) => {
      if (!byDate.has(task.scheduled_date)) byDate.set(task.scheduled_date, []);
      byDate.get(task.scheduled_date)!.push({ ...task, unitName: unit.name });
    });
  });

  // FIX 1: Also collect top-level breaks
  schedule.breaks?.forEach((brk) => {
    if (!byDate.has(brk.scheduled_date)) byDate.set(brk.scheduled_date, []);
    // Avoid duplicates (in case breaks are also embedded in unit tasks)
    const existing = byDate.get(brk.scheduled_date)!;
    const alreadyThere = existing.some(
      t => t.status === 'break' &&
           t.scheduled_start_time === brk.scheduled_start_time &&
           t.planned_duration === brk.planned_duration
    );
    if (!alreadyThere) {
      existing.push({ ...brk, unitName: '' });
    }
  });

  // Also check: breaks embedded inside unit tasks with status 'break'
  // (already collected above via unit.tasks loop — nothing extra needed)

  // ── render days ──────────────────────────────────────────────────────────
  for (const dateKey of [...byDate.keys()].sort()) {
    // Sort by time first
    const sorted = byDate.get(dateKey)!.sort(
      (a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time)
    );

    // FIX 2: Resolve timing conflicts (duplicate start times → sequential slots)
    const all = resolveTimingConflicts(sorted);

    const studyCount = all.filter(t => t.status !== 'break').length;

    y = guard(doc, y, 22);

    // ── date header ─────────────────────────────────────────────────────
    fill(doc, C.card);
    rrect(doc, M, y, CW, 9, 1.5);
    fill(doc, C.pink);
    rrect(doc, M, y, 3, 9, 1);
    color(doc, C.pink);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(formatDate(dateKey), M + 6, y + 6.2);
    color(doc, C.muted);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(`${studyCount} task${studyCount !== 1 ? 's' : ''}`, PW - M - 2, y + 6.2, { align: 'right' });

    y += 11;

    // ── rows ─────────────────────────────────────────────────────────────
    for (const task of all) {
      const isBreak = task.status === 'break';
      const isLunch = isBreak && task.description?.toLowerCase().includes('lunch');
      const isDone  = task.status === 'completed';

      if (isBreak) {
        y = guard(doc, y, 9);
        fill(doc, isLunch ? C.amberD : C.breakD);
        rrect(doc, M, y, CW, 7, 1);
        fill(doc, isLunch ? C.amber : C.breakA);
        rrect(doc, M, y, 2.5, 7, 0.8);

        color(doc, isLunch ? C.amber : C.dim);
        doc.setFontSize(7.5); doc.setFont('helvetica', 'italic');
        doc.text(
          isLunch ? `Lunch Break  —  ${task.planned_duration} min` : `Break  —  ${task.planned_duration} min`,
          M + 6, y + 4.8
        );

        color(doc, isLunch ? [200, 130, 30] as RGB : C.dim);
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.text(formatTime(task.scheduled_start_time), PW - M - 2, y + 4.8, { align: 'right' });

        y += 8.5;
        continue;
      }

      // ── study task row ───────────────────────────────────────────────
      const label     = `[${task.unitName}] ${task.description}`;
      const descLines = doc.splitTextToSize(label, CW - 52) as string[];
      const rh        = Math.max(7, descLines.length * 4.5 + 2);

      y = guard(doc, y, rh + 1);

      fill(doc, isDone ? [18, 30, 18] as RGB : [20, 20, 34] as RGB);
      rrect(doc, M, y, CW, rh, 1);

      // status dot
      fill(doc, isDone ? C.green : C.border);
      doc.circle(M + 3.5, y + rh / 2, 1.4, 'F');

      // time
      color(doc, C.indigo);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text(formatTime(task.scheduled_start_time), M + 7, y + rh / 2 + 1.5);

      // description
      color(doc, isDone ? C.muted : C.white);
      doc.setFontSize(7.5); doc.setFont('helvetica', isDone ? 'italic' : 'normal');
      doc.text(descLines, M + 28, y + 4.5);

      // duration badge
      color(doc, C.muted);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(`${task.planned_duration}m`, PW - M - 2, y + rh / 2 + 1.5, { align: 'right' });

      if (isDone) {
        color(doc, C.green);
        doc.setFontSize(7);
        doc.text('\u2713', PW - M - 8, y + rh / 2 + 1.5, { align: 'right' });
      }

      y += rh + 1.5;
    }

    y += 4; // gap between days
  }

  // ── page footers ──────────────────────────────────────────────────────
  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    color(doc, C.border);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(`Schedule Crusher  •  Page ${p} of ${total}`, PW / 2, PH - 6, { align: 'center' });
  }

  doc.save(`${schedule.title.replace(/[^a-z0-9]/gi, '_')}_schedule.pdf`);
}
