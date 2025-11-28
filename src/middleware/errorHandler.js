import logger from "../utils/logger.js";

/**
 * Error Handler Middleware
 *
 * WHAT IT DOES:
 * - Catches ALL errors from routes and business logic
 * - Provides consistent error response format
 * - Logs errors for debugging
 *
 * HOW IT WORKS:
 * 1. Express calls this middleware when error is thrown
 * 2. We format the error
 * 3. Return JSON response to client
 *
 * IMPORTANT: Must be added LAST in app.use() calls
 * app.use(express.json());
 * app.use(routes);
 * app.use(errorHandler); // ← LAST!
 */

export const errorHandler = (err, req, res, next) => {
  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = null;

  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode,
  });

  // Handle specific error types

  // Validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    details = err.details || [err.message];
  }

  // Database errors (Sequelize)
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    message = "Resource already exists";
    details = err.errors.map((e) => e.message);
  }

  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = "Database Validation Error";
    details = err.errors.map((e) => e.message);
  }

  // JWT errors (for authentication)
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper
 *
 * WHAT IT DOES:
 * - Wraps async route handlers to catch errors
 * - Passes errors to errorHandler middleware
 *
 * USAGE:
 * app.get('/status/:eventId', asyncHandler(async (req, res) => {
 *   // Your async code here
 * }));
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
