import { lectureNeedsAttendance } from './klas.js';

export const DAY = 24 * 60 * 60 * 1000;

// Merged deadline list, like `klap due`.
export function dueItems(snapshot, days, now = Date.now()) {
  const until = now + days * DAY;
  const items = [];
  for (const course of snapshot.courses || []) {
    for (const a of course.assignments?.value || []) {
      if (a.submitted || a.dueAt === null || a.dueAt < now || a.dueAt > until) continue;
      items.push({ kind: 'assignment', key: `a:${course.id}:${a.ordseq}`, course: course.name, courseId: course.id, title: a.title, dueAt: a.dueAt, ordseq: a.ordseq });
    }
    for (const l of course.lectures?.value || []) {
      if (l.endAt === null || l.endAt > until || !lectureNeedsAttendance(l, now)) continue;
      items.push({ kind: 'lecture', key: `l:${course.id}:${l.key}`, course: course.name, courseId: course.id, title: l.title, dueAt: l.endAt, progress: l.progress, week: l.week });
    }
  }
  return items.sort((x, y) => x.dueAt - y.dueAt);
}

