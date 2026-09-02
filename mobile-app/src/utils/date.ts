const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function shortDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${months[date.getMonth()]!.slice(0, 3)} ${date.getDate()}`;
}

export function monthYear(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${months[date.getMonth()]!} ${date.getFullYear()}`;
}

export function shortWeekday(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return weekdays[date.getDay()]!.slice(0, 3);
}

export function longDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${weekdays[date.getDay()]!}, ${months[date.getMonth()]!} ${date.getDate()}`;
}
