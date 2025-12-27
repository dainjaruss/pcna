import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Custom log format for files (JSON)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json()
);

// Create logs directory path
const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

// Daily rotate file transport for combined logs
const combinedRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

// Daily rotate file transport for error logs
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: fileFormat,
});

// Performance logs transport
const performanceRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'performance-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d',
  format: fileFormat,
});

// Security logs transport
const securityRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'security-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
});

// Create the main logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { 
    service: 'pop-culture-news-app',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    combinedRotateTransport,
    errorRotateTransport,
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    ),
  }));
}

// Create performance logger
export const performanceLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { 
    service: 'pop-culture-news-app',
    type: 'performance'
  },
  transports: [performanceRotateTransport],
});

// Create security logger
export const securityLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { 
    service: 'pop-culture-news-app',
    type: 'security'
  },
  transports: [securityRotateTransport],
});

// Performance tracking utilities
interface PerformanceMetrics {
  route: string;
  method: string;
  statusCode: number;
  responseTime: number;
  cacheHit?: boolean;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

export function logPerformance(metrics: PerformanceMetrics): void {
  const level = metrics.responseTime > 500 ? 'warn' : 'info';
  performanceLogger.log(level, `${metrics.method} ${metrics.route}`, {
    ...metrics,
    timestamp: new Date().toISOString(),
  });
}

// Security logging utilities
interface SecurityEvent {
  event: 'login_success' | 'login_failure' | 'logout' | 'password_change' | 
         'rate_limit_exceeded' | 'unauthorized_access' | 'suspicious_activity';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const level = ['login_failure', 'rate_limit_exceeded', 'unauthorized_access', 'suspicious_activity']
    .includes(event.event) ? 'warn' : 'info';
  
  securityLogger.log(level, `Security event: ${event.event}`, {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// Database query logging
interface QueryMetrics {
  query: string;
  duration: number;
  rowCount?: number;
  cached?: boolean;
}

export function logQuery(metrics: QueryMetrics): void {
  const level = metrics.duration > 100 ? 'warn' : 'debug';
  logger.log(level, `Database query`, {
    type: 'database',
    ...metrics,
    timestamp: new Date().toISOString(),
  });
}

// Cache operation logging
interface CacheMetrics {
  operation: 'get' | 'set' | 'delete' | 'invalidate';
  key: string;
  hit?: boolean;
  duration?: number;
}

export function logCacheOperation(metrics: CacheMetrics): void {
  logger.debug(`Cache ${metrics.operation}`, {
    type: 'cache',
    ...metrics,
    timestamp: new Date().toISOString(),
  });
}

// Error logging with context
export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error(error.message, {
    type: 'error',
    stack: error.stack,
    name: error.name,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

// Request logging helper
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: Record<string, unknown>
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, `${method} ${path} ${statusCode}`, {
    type: 'request',
    method,
    path,
    statusCode,
    duration,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

// Async operation wrapper with timing
export async function withLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`${operation} completed`, {
      type: 'operation',
      operation,
      duration,
      success: true,
      ...context,
    });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${operation} failed`, {
      type: 'operation',
      operation,
      duration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      ...context,
    });
    throw error;
  }
}

export default logger;
