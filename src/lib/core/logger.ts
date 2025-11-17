import type { LogMeta } from "./types";

/**
 * Log levels
 */
type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Logger interface for future extensibility
 * Can be replaced with pino, winston, or other logging libraries
 */
interface Logger {
  info(traceId: string, message: string, meta?: LogMeta): void;
  warn(traceId: string, message: string, meta?: LogMeta): void;
  error(traceId: string, message: string, meta?: LogMeta): void;
  debug(traceId: string, message: string, meta?: LogMeta): void;
}

/**
 * Format log entry for console output
 */
function formatLog(
  level: LogLevel,
  traceId: string,
  message: string,
  meta?: LogMeta
): string {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] [${traceId}] ${message}${metaString}`;
}

/**
 * Console-based logger implementation
 * This can be replaced with pino, winston, or other logging libraries
 * by implementing the same interface
 */
class ConsoleLogger implements Logger {
  info(traceId: string, message: string, meta?: LogMeta): void {
    console.log(formatLog("info", traceId, message, meta));
  }

  warn(traceId: string, message: string, meta?: LogMeta): void {
    console.warn(formatLog("warn", traceId, message, meta));
  }

  error(traceId: string, message: string, meta?: LogMeta): void {
    console.error(formatLog("error", traceId, message, meta));
  }

  debug(traceId: string, message: string, meta?: LogMeta): void {
    // Only log debug in development
    if (process.env.NODE_ENV === "development") {
      console.debug(formatLog("debug", traceId, message, meta));
    }
  }
}

/**
 * Singleton logger instance
 * Replace ConsoleLogger with your preferred logging library here
 * Example with pino:
 * ```
 * import pino from 'pino';
 * const pinoLogger = pino({ level: 'info' });
 * const logger = new PinoLoggerAdapter(pinoLogger);
 * ```
 */
export const logger: Logger = new ConsoleLogger();

/**
 * Convenience functions for direct usage
 */
export function logInfo(traceId: string, message: string, meta?: LogMeta): void {
  logger.info(traceId, message, meta);
}

export function logWarn(traceId: string, message: string, meta?: LogMeta): void {
  logger.warn(traceId, message, meta);
}

export function logError(traceId: string, message: string, meta?: LogMeta): void {
  logger.error(traceId, message, meta);
}

export function logDebug(traceId: string, message: string, meta?: LogMeta): void {
  logger.debug(traceId, message, meta);
}
