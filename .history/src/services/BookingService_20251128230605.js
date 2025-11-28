import AsyncLock from "async-lock";
import { Event, Booking, WaitingList } from "../models/index.js";
import sequelize from "../config/database.js";
import logger from "../utils/logger.js";
import { formatDateISO, formatDateReadable } from "../utils/dateFormatter.js";

/**
  BookingService - CORE BUSINESS LOGIC
 
 WHY THIS MATTERS:
  - Handles all ticket booking operations
  - Uses LOCKS to prevent race conditions (THE KEY!)
  - Manages waiting list automatically
 
  CONCURRENCY:
   AsyncLock helps to ensure only ONE operation happens at a time per event
 
  WITHOUT LOCKS:
  User A: reads availableTickets (100) → books
  User B: reads availableTickets (100) → books (at same time!)
  Result: Both booked using same ticket! Leads to OVERBOOKING
 
  WITH LOCKS:
  User A: LOCKS event → reads (100) → decrements to (99) → then UNLOCKS  
  User B: WAITS → LOCKS event → reads (99) → decrements to (98) → then UNLOCKS
  Result: Ensures correct booking count;  OVERBOOKING is prevented
 */

class BookingService {
  constructor() {
    // Create a lock instance - one lock per event ID
    this.lock = new AsyncLock({
      timeout: 5000, // Wait max 5 seconds for lock
      maxPending: 1000, // Max 1000 pending locks
    });
  }

  /**
   * Helper: Format timestamps in response data
   * Converts ISO timestamps to readable format
   */
  formatResponse(data) {
    if (!data) return data;

    if (data.dataValues) {
      const formatted = { ...data.dataValues };
      if (formatted.createdAt) {
        formatted.createdAt = formatDateReadable(formatted.createdAt);
      }
      if (formatted.updatedAt) {
        formatted.updatedAt = formatDateReadable(formatted.updatedAt);
      }
      if (formatted.bookedAt) {
        formatted.bookedAt = formatDateReadable(formatted.bookedAt);
      }
      if (formatted.timestamp) {
        formatted.timestamp = formatDateReadable(formatted.timestamp);
      }
      return formatted;
    }

    return data;
  }

  /**
    INITIALIZE EVENT
    WHAT IT DOES:
   1. Create new event in database
   2. Set available tickets = total tickets
 INPUT:
    name: Event name (e.g., "Concert")
    totalTickets: How many tickets to create

    OUTPUT:
    - Event object with id, name, totalTickets, availableTickets
   
    THROWS Error if validation fails
*/
  async initializeEvent(name, totalTickets) {
    try {
      // Validate inputs
      if (!name || typeof name !== "string") {
        throw new Error("Event name must be a non-empty string");
      }
      if (!Number.isInteger(totalTickets) || totalTickets < 1) {
        throw new Error("Total tickets must be a positive integer");
      }

      // Create event in database
      const event = await Event.create({
        name,
        totalTickets,
        availableTickets: totalTickets,
      });

      logger.info(`Event initialized: ${event.id}, Tickets: ${totalTickets}`);
      return this.formatResponse(event);
    } catch (error) {
      logger.error(`Error initializing event: ${error.message}`);
      throw error;
    }
  }

  /**
    BOOK A TICKET
   
    CONCURRENCY (Uses locks)
    LOGIC:
    1. LOCK the event (no other operation can happen)
    2. Check if tickets are available
       - YES: Create booking with status='confirmed', decrease number available tickets
       - NO: Add to waiting list with status='waiting'
    3. UNLOCK event
    INPUT:
    - eventId: Which event?
    - userId: Who is booking?
   
    OUTPUT:
    - Booking object
   
    THROWS Errors:
    - If event not found
    - If user already has booking for this event
*/
  async bookTicket(eventId, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required");
      }

      // Only ONE bookTicket operation per event at a time
      return await this.lock.acquire(eventId, async () => {
        // Check if user already has booking
        const existingBooking = await Booking.findOne({
          where: { eventId, userId },
          attributes: ["id", "status"],
        });

        if (existingBooking && existingBooking.status !== "cancelled") {
          throw new Error("User already has active booking for this event");
        }

        // Fetch event details
        const event = await Event.findByPk(eventId);
        if (!event) {
          throw new Error("Event not found");
        }

        // CASE 1: Tickets available → Confirm booking
        if (event.availableTickets > 0) {
          // Decrease available tickets by 1
          await event.decrement("availableTickets", { by: 1 });

          // Create confirmed booking
          const booking = await Booking.create({
            eventId,
            userId,
            status: "confirmed",
          });

          logger.info(
            `Ticket booked: User ${userId}, Event ${eventId}, Status: confirmed`
          );
          return this.formatResponse(booking);
        }

        // CASE 2: No tickets → Add to waiting list
        const nextPosition = await this._getNextWaitingPosition(eventId);

        const booking = await Booking.create({
          eventId,
          userId,
          status: "waiting",
          position: nextPosition,
        });

        await WaitingList.create({
          eventId,
          userId,
          position: nextPosition,
        });

        logger.info(
          `Ticket not available: User ${userId}, Event ${eventId}, Position: ${nextPosition}`
        );
        return this.formatResponse(booking);
      });
    } catch (error) {
      logger.error(`Error booking ticket: ${error.message}`);
      throw error;
    }
  }

  /**
   * CANCEL A BOOKING
   *
   * CONCURRENCY CRITICAL! Uses locks!
   *
   * LOGIC:
   * 1. LOCK the event
   * 2. Find and cancel the booking
   * 3. Increase available tickets by 1
   * 4. Check waiting list
   *    - If people waiting: Auto-assign first person
   *    - Update positions of remaining people
   * 5. UNLOCK event
   *
   * INPUT:
   * - eventId: Which event?
   * - userId: Who is cancelling?
   *
   * OUTPUT:
   * - Booking object (status='cancelled')
   * - Assigned user (if any) from waiting list
   */
  async cancelBooking(eventId, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required");
      }

      return await this.lock.acquire(eventId, async () => {
        // Find the booking
        const booking = await Booking.findOne({
          where: { eventId, userId, status: "confirmed" },
        });

        if (!booking) {
          throw new Error("No confirmed booking found for this user");
        }

        // Mark booking as cancelled
        await booking.update({ status: "cancelled" });

        // Increase available tickets
        const event = await Event.findByPk(eventId);
        await event.increment("availableTickets", { by: 1 });

        logger.info(`Booking cancelled: User ${userId}, Event ${eventId}`);

        // Check if anyone is waiting
        const nextWaiting = await WaitingList.findOne({
          where: { eventId, status: "waiting" },
          order: [["position", "ASC"]],
        });

        let assignedUser = null;

        if (nextWaiting) {
          // AUTO-ASSIGN: Update waiting user to confirmed
          assignedUser = await this._assignWaitingUserToTicket(
            eventId,
            nextWaiting.userId
          );
          // Decrement available tickets back since the waiting user filled it
          await event.decrement("availableTickets", { by: 1 });
        }

        return { cancelledBooking: booking, assignedUser };
      });
    } catch (error) {
      logger.error(`Error cancelling booking: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET EVENT STATUS
   *
   * WHAT IT DOES:
   * Returns current state of event:
   * - Available tickets count
   * - Waiting list count
   * - Total bookings
   *
   * INPUT:
   * - eventId: Which event?
   *
   * OUTPUT:
   * - Event with aggregated counts
   */
  async getEventStatus(eventId) {
    try {
      if (!eventId) {
        throw new Error("Event ID is required");
      }

      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      // Count waiting people
      const waitingCount = await WaitingList.count({
        where: { eventId, status: "waiting" },
      });

      // Count confirmed bookings
      const confirmedCount = await Booking.count({
        where: { eventId, status: "confirmed" },
      });

      return {
        eventId: event.id,
        eventName: event.name,
        totalTickets: event.totalTickets,
        availableTickets: event.availableTickets,
        bookedTickets: confirmedCount,
        waitingListCount: waitingCount,
        timestamp: formatDateReadable(new Date()),
      };
    } catch (error) {
      logger.error(`Error getting event status: ${error.message}`);
      throw error;
    }
  }

  /**
   * HELPER: Get next waiting list position
   * Used when adding new person to waiting list
   * Must handle concurrent requests safely
   */
  async _getNextWaitingPosition(eventId) {
    const lastWaiting = await WaitingList.findOne({
      where: { eventId, status: "waiting" },
      order: [["position", "DESC"]],
      attributes: ["position"],
    });

    return lastWaiting ? lastWaiting.position + 1 : 1;
  }

  /**
   * HELPER: Auto-assign waiting user to ticket
   * Called when a cancellation happens and someone is waiting
   */
  async _assignWaitingUserToTicket(eventId, userId) {
    try {
      // Update waiting list entry to assigned
      await WaitingList.update(
        { status: "assigned" },
        { where: { eventId, userId } }
      );

      // Update booking to confirmed
      const booking = await Booking.findOne({
        where: { eventId, userId, status: "waiting" },
      });

      if (booking) {
        await booking.update({ status: "confirmed" });
        logger.info(
          `Auto-assigned waiting user to ticket: User ${userId}, Event ${eventId}`
        );
      }

      // NOTE: We DON'T renumber positions to avoid UNIQUE constraint violations
      // Gaps in positions are fine - queries use ORDER BY position anyway
      // The important thing is that positions are unique per event, not sequential

      return booking;
    } catch (error) {
      logger.error(`Error assigning waiting user: ${error.message}`);
      throw error;
    }
  }
}

export default new BookingService();
