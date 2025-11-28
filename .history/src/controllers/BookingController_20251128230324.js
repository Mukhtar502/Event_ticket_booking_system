import bookingService from "../services/BookingService.js";
import logger from "../utils/logger.js";
import { formatDateReadable } from "../utils/dateFormatter.js";

/**
 * BookingController
 *
 * WHAT IT DOES:
 * - Receives HTTP requests
 * - Calls business logic (BookingService)
 * - Formats and sends responses
 *
 * LAYER STRUCTURE:
 * HTTP Request
 *      ↓
 * Router validates input
 *      ↓
 * Controller (this file)
 *      ↓
 * Service (BookingService - business logic)
 *      ↓
 * Database Models
 *      ↓
 * PostgreSQL
 */

class BookingController {
  /**
   * Initialize Event
   * POST /initialize
   *
   * REQUEST BODY:
   * {
   *   "name": "Concert Event",
   *   "totalTickets": 100
   * }
   *
   * RESPONSE:
   * {
   *   "success": true,
   *   "data": { event object }
   * }
   */
  async initializeEvent(req, res) {
    try {
      const { name, totalTickets } = req.body;

      // Call service
      const event = await bookingService.initializeEvent(name, totalTickets);

      res.status(201).json({
        success: true,
        message: "Event initialized successfully",
        data: event,
      });
    } catch (error) {
      logger.error(`Initialize event error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Book Ticket
   * POST /book
   *
   * REQUEST BODY:
   * {
   *   "eventId": "uuid-here",
   *   "userId": "user-123"
   * }
   *
   * RESPONSE:
   * {
   *   "success": true,
   *   "data": { booking object },
   *   "message": "Ticket booked successfully" or "Added to waiting list"
   * }
   */
  async bookTicket(req, res) {
    try {
      const { eventId, userId } = req.body;

      // Call service
      const booking = await bookingService.bookTicket(eventId, userId);

      const message =
        booking.status === "confirmed"
          ? "Ticket booked successfully"
          : `Added to waiting list at position ${booking.position}`;

      res.status(201).json({
        success: true,
        message,
        data: booking,
      });
    } catch (error) {
      logger.error(`Book ticket error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel Booking
   * POST /cancel
   *
   * REQUEST BODY:
   * {
   *   "eventId": "uuid-here",
   *   "userId": "user-123"
   * }
   *
   * RESPONSE:
   * {
   *   "success": true,
   *   "data": {
   *     "cancelledBooking": { booking object },
   *     "assignedUser": { booking object or null }
   *   },
   *   "message": "Booking cancelled..." or "Booking cancelled and next user assigned..."
   * }
   */
  async cancelBooking(req, res) {
    try {
      const { eventId, userId } = req.body;

      // Call service
      const result = await bookingService.cancelBooking(eventId, userId);

      const message = result.assignedUser
        ? `Booking cancelled and next waiting user (${result.assignedUser.userId}) assigned`
        : "Booking cancelled successfully";

      res.status(200).json({
        success: true,
        message,
        data: result,
      });
    } catch (error) {
      logger.error(`Cancel booking error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Event Status
   * GET /status/:eventId
   *
   * RESPONSE:
   * {
   *   "success": true,
   *   "data": {
   *     "eventId": "uuid",
   *     "eventName": "Concert",
   *     "totalTickets": 100,
   *     "availableTickets": 45,
   *     "bookedTickets": 55,
   *     "waitingListCount": 10
   *   }
   * }
   */
  async getEventStatus(req, res) {
    try {
      const { eventId } = req.params;

      // Call service
      const status = await bookingService.getEventStatus(eventId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error(`Get event status error: ${error.message}`);
      throw error;
    }
  }
}

export default new BookingController();
