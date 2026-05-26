"""
ISM Weighted Scheduling Algorithm for Schedule Crusher.

Generates a linear, chronological daily schedule:
  1. Rank tasks by importance (high → morning, medium → midday, low → evening).
  2. Fill each day as a single timeline — no parallel queues — so every task
     gets a unique start time and breaks appear correctly between work blocks.
  3. Emit break and lunch entries as first-class task_type='break'/'lunch' items.
"""

from datetime import date, timedelta
from typing import Any


def generate_schedule(
    start_date: date,
    end_date: date,
    units_data: list[dict[str, Any]],
    settings: dict[str, Any],
) -> list[dict[str, Any]]:
    """Generate a complete, non-overlapping study schedule with break slots.

    Returns:
        List of task dicts ordered by date then start time. Each dict has:
            unit_index, point_index, description,
            scheduled_date, scheduled_start_time, planned_duration, task_type
        task_type is 'study', 'break', or 'lunch'.
    """

    # ── 1. Settings ───────────────────────────────────────────────────────────
    work_start_hour     = int(settings.get('work_start_hour', 8))
    work_end_hour       = int(settings.get('work_end_hour', 21))
    break_duration      = int(settings.get('break_duration', 15))
    work_block_duration = int(settings.get('work_block_duration', 90))
    lunch_start_hour    = int(settings.get('lunch_break_start', 13))
    lunch_duration      = int(settings.get('lunch_break_duration', 30))

    day_start_min   = work_start_hour * 60
    day_end_min     = work_end_hour * 60
    lunch_start_min = lunch_start_hour * 60
    lunch_end_min   = lunch_start_min + lunch_duration

    if day_end_min <= day_start_min:
        raise ValueError('work_end_hour must be after work_start_hour')

    # ── 2. Calculate productive minutes per day ───────────────────────────────
    gross = day_end_min - day_start_min
    lunch_overlap = (
        lunch_duration
        if day_start_min <= lunch_start_min and lunch_end_min <= day_end_min
        else 0
    )
    net = gross - lunch_overlap
    if net <= 0:
        raise ValueError('Work window is too small')

    if work_block_duration > 0:
        cycle = work_block_duration + break_duration
        productive_per_day = (net / cycle) * work_block_duration
    else:
        productive_per_day = net

    num_days = (end_date - start_date).days + 1
    if num_days <= 0:
        raise ValueError('end_date must be on or after start_date')

    total_productive = productive_per_day * num_days

    # ── 3. Weighted allocation per unit ──────────────────────────────────────
    weighted_total = sum(
        int(u['importance']) * int(u['total_points']) for u in units_data
    )
    if weighted_total == 0:
        raise ValueError('Weighted total is zero')

    # ── 4. Build flat task list sorted by importance desc then unit order ─────
    all_tasks: list[dict] = []
    for idx, u in enumerate(units_data):
        importance   = int(u['importance'])
        total_points = int(u['total_points'])
        weight       = importance * total_points
        allocated    = (weight / weighted_total) * total_productive
        per_point    = max(10, round(allocated / total_points))

        for pt in range(1, total_points + 1):
            all_tasks.append({
                'unit_index':      idx,
                'unit_name':       u['name'],
                'importance':      importance,
                'point_index':     pt,
                'total_points':    total_points,
                'planned_duration': per_point,
            })

    # Sort: highest importance first so they get morning slots
    all_tasks.sort(key=lambda t: -t['importance'])

    # ── 5. Helpers ────────────────────────────────────────────────────────────
    def _hhmm(minutes: int) -> str:
        return f'{minutes // 60:02d}:{minutes % 60:02d}'

    # ── 6. Fill days linearly ─────────────────────────────────────────────────
    result: list[dict] = []
    task_queue = list(all_tasks)  # working copy

    for day_offset in range(num_days):
        if not task_queue:
            break

        current_date = start_date + timedelta(days=day_offset)
        cursor        = day_start_min
        block_elapsed = 0   # continuous work minutes in current block

        # Emit the lunch break entry once per day (it will sort into place later)
        if lunch_overlap:
            result.append({
                'unit_index':           -1,
                'point_index':          0,
                'description':          f'🍽️ Lunch break — {lunch_duration} min',
                'scheduled_date':       current_date.isoformat(),
                'scheduled_start_time': _hhmm(lunch_start_min),
                'planned_duration':     lunch_duration,
                'task_type':            'lunch',
            })

        while task_queue and cursor < day_end_min:
            # ── skip over lunch window ────────────────────────────────────
            if cursor < lunch_end_min and cursor + 1 > lunch_start_min and lunch_overlap:
                cursor = lunch_end_min
                block_elapsed = 0   # fresh block after lunch
                if cursor >= day_end_min:
                    break

            task     = task_queue[0]
            duration = task['planned_duration']

            # ── insert break if work block is full ────────────────────────
            if block_elapsed > 0 and block_elapsed + duration > work_block_duration:
                # make sure break doesn't overlap lunch
                break_end = cursor + break_duration
                if cursor < lunch_start_min < break_end and lunch_overlap:
                    # push cursor past lunch instead
                    cursor = lunch_end_min
                    block_elapsed = 0
                elif break_duration > 0 and cursor + break_duration <= day_end_min:
                    result.append({
                        'unit_index':           -1,
                        'point_index':          0,
                        'description':          f'☕ Break — rest for {break_duration} min',
                        'scheduled_date':       current_date.isoformat(),
                        'scheduled_start_time': _hhmm(cursor),
                        'planned_duration':     break_duration,
                        'task_type':            'break',
                    })
                    cursor        += break_duration
                    block_elapsed  = 0
                else:
                    block_elapsed = 0  # can't fit break, just reset counter

                if cursor >= day_end_min:
                    break

            # ── re-check lunch skip after break ──────────────────────────
            if cursor < lunch_end_min and cursor + 1 > lunch_start_min and lunch_overlap:
                cursor = lunch_end_min
                block_elapsed = 0
                if cursor >= day_end_min:
                    break

            # ── check if task fits before end of day / lunch ──────────────
            next_wall = day_end_min
            if lunch_overlap and cursor < lunch_start_min:
                next_wall = min(next_wall, lunch_start_min)

            if cursor + duration > next_wall:
                remaining = next_wall - cursor
                if remaining < 5:
                    # Jump past the wall
                    if next_wall == lunch_start_min:
                        cursor = lunch_end_min
                        block_elapsed = 0
                    else:
                        break
                    continue
                duration = remaining

            # ── schedule the task ─────────────────────────────────────────
            result.append({
                'unit_index':           task['unit_index'],
                'point_index':          task['point_index'],
                'description':          f"{task['unit_name']} — Point {task['point_index']}/{task['total_points']}",
                'scheduled_date':       current_date.isoformat(),
                'scheduled_start_time': _hhmm(cursor),
                'planned_duration':     duration,
                'task_type':            'study',
            })

            cursor        += duration
            block_elapsed += duration
            task_queue.pop(0)

            # ── complete block → take break ───────────────────────────────
            if block_elapsed >= work_block_duration:
                break_end = cursor + break_duration
                if cursor < lunch_start_min < break_end and lunch_overlap:
                    cursor = lunch_end_min
                    block_elapsed = 0
                elif break_duration > 0 and cursor + break_duration <= day_end_min:
                    result.append({
                        'unit_index':           -1,
                        'point_index':          0,
                        'description':          f'☕ Break — rest for {break_duration} min',
                        'scheduled_date':       current_date.isoformat(),
                        'scheduled_start_time': _hhmm(cursor),
                        'planned_duration':     break_duration,
                        'task_type':            'break',
                    })
                    cursor        += break_duration
                    block_elapsed  = 0
                else:
                    block_elapsed = 0

    # ── 7. Overflow: remaining tasks spill into extra day-cycles ─────────────
    safety = 0
    while task_queue and safety < num_days * 3:
        safety += 1
        current_date  = start_date + timedelta(days=safety % num_days)
        cursor        = day_start_min
        block_elapsed = 0

        while task_queue and cursor < day_end_min:
            if cursor < lunch_end_min and cursor + 1 > lunch_start_min and lunch_overlap:
                cursor = lunch_end_min
                block_elapsed = 0

            task     = task_queue[0]
            duration = task['planned_duration']

            if block_elapsed > 0 and block_elapsed + duration > work_block_duration:
                cursor        += break_duration
                block_elapsed  = 0
                continue

            next_wall = day_end_min
            if lunch_overlap and cursor < lunch_start_min:
                next_wall = min(next_wall, lunch_start_min)

            if cursor + duration > next_wall:
                remaining = next_wall - cursor
                if remaining < 5:
                    cursor = lunch_end_min if next_wall == lunch_start_min else day_end_min
                    block_elapsed = 0
                    continue
                duration = remaining

            result.append({
                'unit_index':           task['unit_index'],
                'point_index':          task['point_index'],
                'description':          f"{task['unit_name']} — Point {task['point_index']}/{task['total_points']}",
                'scheduled_date':       current_date.isoformat(),
                'scheduled_start_time': _hhmm(cursor),
                'planned_duration':     duration,
                'task_type':            'study',
            })

            cursor        += duration
            block_elapsed += duration
            task_queue.pop(0)

            if block_elapsed >= work_block_duration:
                cursor        += break_duration
                block_elapsed  = 0

    return result
