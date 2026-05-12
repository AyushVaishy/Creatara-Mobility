type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: string
  data?: unknown
  timestamp: string
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ''}`
  return `${prefix} ${entry.message}`
}

function log(level: LogLevel, message: string, context?: string, data?: unknown): void {
  // In production (Vercel), structured logs are captured automatically
  if (process.env.NODE_ENV === 'test') return

  const entry: LogEntry = {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV === 'development') console.debug(formatted, data ?? '')
      break
    case 'info':
      console.info(formatted, data ?? '')
      break
    case 'warn':
      console.warn(formatted, data ?? '')
      break
    case 'error':
      console.error(formatted, data ?? '')
      break
  }
}

export const logger = {
  debug: (message: string, context?: string, data?: unknown) =>
    log('debug', message, context, data),
  info:  (message: string, context?: string, data?: unknown) =>
    log('info',  message, context, data),
  warn:  (message: string, context?: string, data?: unknown) =>
    log('warn',  message, context, data),
  error: (message: string, context?: string, data?: unknown) =>
    log('error', message, context, data),
}

export default logger
