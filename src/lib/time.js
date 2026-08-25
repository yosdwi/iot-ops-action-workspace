export const APP_TIME_ZONE = 'Asia/Jakarta'

export function jakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function jakartaTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function jakartaDateTimeLabel(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function displayTime(value) {
  if (!value) return '—'
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
}
