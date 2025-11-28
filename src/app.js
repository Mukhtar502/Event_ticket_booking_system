import express from "express";
import dotenv from "dotenv";
import bookingRoutes from "./routes/bookingRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import { formatDateReadable } from "./utils/dateFormatter.js";

dotenv.config();

/**
 * Express App Setup
 *
 * WHAT IT DOES:
 * - Creates Express app instance
 * - Adds middleware (JSON parser, logging, routes)
 * - Sets up error handling
 *
 * MIDDLEWARE ORDER MATTERS:
 * 1. JSON parser (converts req.body to JSON)
 * 2. Request logging
 * 3. Routes (your API endpoints)
 * 4. Error handler (catches all errors) - MUST BE LAST
 *
 * WHY:
 * If error handler is in wrong place, errors won't be caught properly
 */

const app = express();

// ============= MIDDLEWARE =============

// Parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============= ROUTES =============

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: formatDateReadable(new Date()),
  });
});

// Main API routes
app.use(bookingRoutes);

// 404 handler (if route not found)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
  });
});

// ============= ERROR HANDLING =============
// IMPORTANT: Must be last middleware!
app.use(errorHandler);

export default app;
