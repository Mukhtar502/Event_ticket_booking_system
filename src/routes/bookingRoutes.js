import express from "express";
import bookingController from "../controllers/BookingController.js";
import {
  createValidationMiddleware,
  initializeEventSchema,
  bookTicketSchema,
  cancelBookingSchema,
} from "../middleware/validation.js";
import { asyncHandler } from "../middleware/errorHandler.js";

/**
 * Booking Routes
 *
 * WHAT IT DOES:
 * - Defines all API endpoints
 * - Connects validation → controller
 *
 * HOW IT WORKS:
 * 1. Request comes in (e.g., POST /book)
 * 2. Validation middleware checks data
 * 3. If valid → asyncHandler wraps controller
 * 4. If invalid → Error response sent
 *
 * ROUTES:
 * POST   /initialize     - Create new event
 * POST   /book          - Book a ticket
 * POST   /cancel        - Cancel a booking
 * GET    /status/:id    - Get event status
 */

const router = express.Router();

/**
 * POST /initialize
 * Initialize a new event with tickets
 *
 * BODY: { name, totalTickets }
 */
router.post(
  "/initialize",
  createValidationMiddleware(initializeEventSchema),
  asyncHandler((req, res) => bookingController.initializeEvent(req, res))
);

/**
 * POST /book
 * Book a ticket for a user
 *
 * BODY: { eventId, userId }
 */
router.post(
  "/book",
  createValidationMiddleware(bookTicketSchema),
  asyncHandler((req, res) => bookingController.bookTicket(req, res))
);

/**
 * POST /cancel
 * Cancel a booking (free up a ticket)
 *
 * BODY: { eventId, userId }
 */
router.post(
  "/cancel",
  createValidationMiddleware(cancelBookingSchema),
  asyncHandler((req, res) => bookingController.cancelBooking(req, res))
);

/**
 * GET /status/:eventId
 * Get current event status (tickets available, waiting list, etc)
 *
 * PARAMS: eventId (in URL)
 */
router.get(
  "/status/:eventId",
  asyncHandler((req, res) => bookingController.getEventStatus(req, res))
);

export default router;
