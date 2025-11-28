import winston from "winston";
import dotenv from "dotenv";
import { formatDateCompact } from "./dateFormatter.js";

dotenv.config();

/**
 * Logger Configuration
 *
 * WHAT IT DOES:
 * - Provides structured logging
 * - Logs to both file and console
 * - Different log levels: error, warn, info, debug
 * - Uses human-readable date format
 *
 * USAGE:
 * import logger from '../utils/logger.js';
 * logger.info('User booked a ticket');
 * logger.error('Failed to book ticket');
 */

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => formatDateCompact(new Date()),
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "booking-service" },
  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

// In development, also log to console
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;
