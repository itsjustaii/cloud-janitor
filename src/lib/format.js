const pad = (n) => String(n).padStart(2, '0');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 0:30:05 under a day, "2d 3h" for longer
export function formatCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  if (d >= 1) return `${d}d ${h}h`;
  return `${h}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

export const formatTime = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// "Today 16:30" or "Thu 09:15"
export function formatClock(ms, now) {
  const sameDay = new Date(now).toDateString() === new Date(ms).toDateString();
  return `${sameDay ? 'Today' : DAYS[new Date(ms).getDay()]} ${formatTime(ms)}`;
}

// "Today", "Yesterday" or "Monday, 19 Oct"
export function formatDay(ms, now) {
  const d = new Date(ms);
  if (d.toDateString() === new Date(now).toDateString()) return 'Today';
  if (d.toDateString() === new Date(now - 86_400_000).toDateString()) return 'Yesterday';
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const formatMoney = (n) => `$${n.toFixed(2)}`;
export const formatScan = (ms) => `${Math.floor(ms / 60_000)}:${pad(Math.floor((ms % 60_000) / 1000))}`;
export { DAYS, MONTHS };
