import { isToday, isPast, parseISO } from '../utils/dates';

export default function FollowUpBadge({ date }) {
  if (!date) return null;
  const d = parseISO(date);
  if (isToday(d)) {
    return <span className="badge bg-yellow-100 text-yellow-800 font-semibold">Follow up TODAY</span>;
  }
  if (isPast(d)) {
    return <span className="badge bg-red-100 text-red-800 font-semibold">Overdue</span>;
  }
  return <span className="badge bg-green-100 text-green-800">{date}</span>;
}
