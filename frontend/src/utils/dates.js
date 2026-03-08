export function parseISO(str) {
  return new Date(str + 'T00:00:00');
}

export function isToday(d) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export function isPast(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d < today;
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
