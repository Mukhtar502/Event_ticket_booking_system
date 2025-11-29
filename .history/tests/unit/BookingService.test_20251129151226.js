/**
 * Unit Tests for BookingService
 *
 * WHAT IT TESTS:
 * - Core business logic without HTTP layer
 * - Database interactions
 * - Concurrency handling
 * - Edge cases
 *
 * TDD APPROACH:
 * These tests are written FIRST
 * Then implemented code to make them pass
 *
 * HOW TO RUN:
 * npm run test:unit
 * npm run test:watch (runs on every file change)
 *
 * COVERAGE:
 *  aiming for 80%+ test coverage
 */

import sequelize from "../../src/config/database.js";
import { Event, Booking, WaitingList } from "../../src/models/index.js";
import bookingService from "../../src/services/BookingService.js";

// ============= TEST SETUP =============

describe("BookingService", () => {
  // Before all tests: create tables
  beforeAll(async () => {
    // Use test database
    await sequelize.sync({ force: true });
  });

  // After each test: clean up
  afterEach(async () => {
    await WaitingList.destroy({ where: {} });
    await Booking.destroy({ where: {} });
    await Event.destroy({ where: {} });
  });

  // After all tests: close database connection
  afterAll(async () => {
    await sequelize.close();
  });

  // ============= INITIALIZE EVENT TESTS =============

  describe("initializeEvent", () => {
    test("should create an event with correct ticket count", async () => {
      const event = await bookingService.initializeEvent("Concert", 100);

      expect(event).toBeDefined();
      expect(event.name).toBe("Concert");
      expect(event.totalTickets).toBe(100);
      expect(event.availableTickets).toBe(100);
    });

    test("should throw error for invalid event name", async () => {
      await expect(bookingService.initializeEvent("", 100)).rejects.toThrow(
        "Event name must be a non-empty string"
      );
    });

    test("should throw error for invalid ticket count", async () => {
      await expect(
        bookingService.initializeEvent("Concert", -5)
      ).rejects.toThrow("Total tickets must be a positive integer");

      await expect(
        bookingService.initializeEvent("Concert", 0)
      ).rejects.toThrow("Total tickets must be a positive integer");
    });

    test("should throw error for non-integer ticket count", async () => {
      await expect(
        bookingService.initializeEvent("Concert", 50.5)
      ).rejects.toThrow("Total tickets must be a positive integer");
    });
  });

  // ============= BOOK TICKET TESTS =============

  describe("bookTicket", () => {
    let event;

    beforeEach(async () => {
      event = await bookingService.initializeEvent("Test Event", 2);
    });

    test("should book a ticket when available", async () => {
      const booking = await bookingService.bookTicket(event.id, "user1");

      expect(booking.status).toBe("confirmed");
      expect(booking.eventId).toBe(event.id);
      expect(booking.userId).toBe("user1");
      expect(booking.position).toBeNull();

      // Verify available tickets decreased
      const updatedEvent = await Event.findByPk(event.id);
      expect(updatedEvent.availableTickets).toBe(1);
    });

    test("should add user to waiting list when sold out", async () => {
      // Book 2 users (fill all tickets)
      await bookingService.bookTicket(event.id, "user1");
      await bookingService.bookTicket(event.id, "user2");

      // Third user should be on waiting list
      const booking = await bookingService.bookTicket(event.id, "user3");

      expect(booking.status).toBe("waiting");
      expect(booking.position).toBe(1);

      // Event should still have 0 available
      const updatedEvent = await Event.findByPk(event.id);
      expect(updatedEvent.availableTickets).toBe(0);
    });

    test("should prevent duplicate bookings for same user", async () => {
      await bookingService.bookTicket(event.id, "user1");

      // Try to book again
      await expect(
        bookingService.bookTicket(event.id, "user1")
      ).rejects.toThrow("User already has active booking for this event");
    });

    test("should throw error for non-existent event", async () => {
      // Use a valid UUID format but non-existent
      try {
        await bookingService.bookTicket(
          "00000000-0000-0000-0000-000000000000",
          "user1"
        );
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain("Event not found");
      }
    });

    test("should require event ID and user ID", async () => {
      await expect(bookingService.bookTicket(null, "user1")).rejects.toThrow(
        "Event ID and User ID are required"
      );

      await expect(bookingService.bookTicket(event.id, null)).rejects.toThrow(
        "Event ID and User ID are required"
      );
    });

    test("should handle multiple sequential bookings correctly", async () => {
      // Book all tickets
      const booking1 = await bookingService.bookTicket(event.id, "user1");
      const booking2 = await bookingService.bookTicket(event.id, "user2");

      expect(booking1.status).toBe("confirmed");
      expect(booking2.status).toBe("confirmed");

      // Verify counts
      let updatedEvent = await Event.findByPk(event.id);
      expect(updatedEvent.availableTickets).toBe(0);

      // Now waiting list
      const booking3 = await bookingService.bookTicket(event.id, "user3");
      expect(booking3.status).toBe("waiting");
    });
  });

  // ============= CANCEL BOOKING TESTS =============

  describe("cancelBooking", () => {
    let event;

    beforeEach(async () => {
      event = await bookingService.initializeEvent("Test Event", 2);
    });

    test("should cancel a confirmed booking", async () => {
      const booking = await bookingService.bookTicket(event.id, "user1");

      const cancelled = await bookingService.cancelBooking(event.id, "user1");

      expect(cancelled.cancelledBooking.status).toBe("cancelled");
      expect(cancelled.assignedUser).toBeNull();

      // Verify tickets increased
      const updatedEvent = await Event.findByPk(event.id);
      expect(updatedEvent.availableTickets).toBe(2);
    });

    test("should auto-assign waiting user when cancellation happens", async () => {
      // Fill all tickets
      await bookingService.bookTicket(event.id, "user1");
      await bookingService.bookTicket(event.id, "user2");

      // Add to waiting list
      const waitingBooking = await bookingService.bookTicket(event.id, "user3");
      expect(waitingBooking.status).toBe("waiting");

      // Cancel first booking
      const result = await bookingService.cancelBooking(event.id, "user1");

      // Waiting user should be assigned
      expect(result.assignedUser).toBeDefined();
      expect(result.assignedUser.userId).toBe("user3");
      expect(result.assignedUser.status).toBe("confirmed");
    });

    test("should throw error if no confirmed booking to cancel", async () => {
      await expect(
        bookingService.cancelBooking(event.id, "unknown-user")
      ).rejects.toThrow("No confirmed booking found for this user");
    });

    test("should update waiting list positions after auto-assignment", async () => {
      // Create event with 1 ticket: 1 confirmed, 2 waiting
      const singleTicketEvent = await bookingService.initializeEvent(
        "Single Ticket Event",
        1
      );
      const booking1 = await bookingService.bookTicket(
        singleTicketEvent.id,
        "user1"
      ); // confirmed
      expect(booking1.status).toBe("confirmed");

      const booking2 = await bookingService.bookTicket(
        singleTicketEvent.id,
        "user2"
      ); // waiting pos 1
      expect(booking2.status).toBe("waiting");

      const booking3 = await bookingService.bookTicket(
        singleTicketEvent.id,
        "user3"
      ); // waiting pos 2
      expect(booking3.status).toBe("waiting");

      // Cancel confirmed - should auto-assign user2
      const cancelResult = await bookingService.cancelBooking(
        singleTicketEvent.id,
        "user1"
      );
      expect(cancelResult.assignedUser.userId).toBe("user2");
      expect(cancelResult.assignedUser.status).toBe("confirmed");

      // Check remaining waiting - only user3 should remain
      const waitingUsers = await WaitingList.findAll({
        where: { eventId: singleTicketEvent.id, status: "waiting" },
        order: [["position", "ASC"]],
      });

      expect(waitingUsers.length).toBe(1);
      expect(waitingUsers[0].userId).toBe("user3");
    });
  });

  // ============= GET EVENT STATUS TESTS =============

  describe("getEventStatus", () => {
    test("should return correct event status", async () => {
      const event = await bookingService.initializeEvent("Status Test", 2);

      // Book some tickets
      await bookingService.bookTicket(event.id, "user1");
      await bookingService.bookTicket(event.id, "user2");

      // Add to waiting list
      await bookingService.bookTicket(event.id, "user3");

      const status = await bookingService.getEventStatus(event.id);

      expect(status.eventId).toBe(event.id);
      expect(status.totalTickets).toBe(2);
      expect(status.availableTickets).toBe(0);
      expect(status.bookedTickets).toBe(2);
      expect(status.waitingListCount).toBe(1);
    });

    test("should throw error for non-existent event", async () => {
      try {
        await bookingService.getEventStatus(
          "00000000-0000-0000-0000-000000000000"
        );
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain("Event not found");
      }
    });

    test("should require event ID", async () => {
      try {
        await bookingService.getEventStatus(null);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain("Event ID is required");
      }
    });
  });

  describe("Concurrency Handling", () => {
    // Each test needs its own event to avoid interference
    // These tests verify the AsyncLock mechanism works correctly

    test("should prevent overbooking with concurrent requests", async () => {
      const event = await bookingService.initializeEvent("Concurrent Test", 10);

      // Simulate 20 concurrent booking requests
      const bookingPromises = Array.from({ length: 20 }, (_, i) =>
        bookingService.bookTicket(event.id, `user${i + 1}`)
      );

      const results = await Promise.all(bookingPromises);

      // Count confirmed vs waiting
      const confirmed = results.filter((r) => r.status === "confirmed");
      const waiting = results.filter((r) => r.status === "waiting");

      expect(confirmed.length).toBe(10); // Should be exactly 10
      expect(waiting.length).toBe(10); // Rest should be waiting

      // Verify event state
      const updatedEvent = await Event.findByPk(event.id);
      expect(updatedEvent.availableTickets).toBe(0);
    });

    test("should handle concurrent cancellations and bookings", async () => {
      const event = await bookingService.initializeEvent(
        "Concurrent Test 2",
        5
      );

      // Fill tickets
      await bookingService.bookTicket(event.id, "user1");
      await bookingService.bookTicket(event.id, "user2");
      await bookingService.bookTicket(event.id, "user3");
      await bookingService.bookTicket(event.id, "user4");
      await bookingService.bookTicket(event.id, "user5");

      // Add to waiting
      await bookingService.bookTicket(event.id, "user6");
      await bookingService.bookTicket(event.id, "user7");

      // Concurrent: cancel user1 and try to book user8
      const [cancelResult, bookingResult] = await Promise.all([
        bookingService.cancelBooking(event.id, "user1"),
        bookingService.bookTicket(event.id, "user8"),
      ]);

      // Either user6 or user8 should be confirmed
      // The other should be waiting
      const user6Booking = await Booking.findOne({
        where: { userId: "user6", eventId: event.id },
      });
      const user8Booking = await Booking.findOne({
        where: { userId: "user8", eventId: event.id },
      });

      // Total confirmed should be 5
      const confirmedCount = await Booking.count({
        where: { eventId: event.id, status: "confirmed" },
      });
      expect(confirmedCount).toBe(5);
    });
  });
});
