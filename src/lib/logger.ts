// Simple logger for ADAF Dashboard
// Production-ready logging with different levels

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, unknown>
}

class Logger {
  private minLevel: LogLevel = 'info'

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel
    if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
      this.minLevel = envLevel
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    return levels[level] >= levels[this.minLevel]
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    let message = `[${timestamp}] ${level} ${entry.message}`
    
    if (entry.context) {
      message += ` ${JSON.stringify(entry.context)}`
    }
    
    return message
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context
    }

    const formattedMessage = this.formatMessage(entry)

    // Console output with appropriate method
    switch (level) {
      case 'error':
        console.error(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'debug':
        console.debug(formattedMessage)
        break
      default:
        console.log(formattedMessage)
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }

  // Convenience methods for common patterns
  apiCall(method: string, path: string, duration?: number): void {
    this.info(`API ${method} ${path}`, { duration })
  }

  dbQuery(query: string, duration?: number): void {
    this.debug(`DB Query: ${query}`, { duration })
  }

  authEvent(event: string, userId?: string): void {
    this.info(`Auth: ${event}`, { userId })
  }
}

export const logger = new Logger()