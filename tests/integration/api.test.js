/**
 * Integration Tests for API Endpoints
 *
 * WHAT IT TESTS:
 * - Full HTTP request/response cycle
 * - Middleware (validation, error handling)
 * - Status codes and response formats
 * - End-to-end workflows
 *
 * HOW TO RUN:
 * npm run test:integration
 */

import request from "supertest";
import sequelize from "../../src/config/database.js";
import { Event, Booking, WaitingList } from "../../src/models/index.js";
import app from "../../src/app.js";

describe("API Integration Tests", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await WaitingList.destroy({ where: {} });
    await Booking.destroy({ where: {} });
    await Event.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ============= HEALTH CHECK =============

  describe("Health Check", () => {
    test("GET /health should return success", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Server is running");
    });
  });

  // ============= INITIALIZE EVENT TESTS =============

  describe("POST /initialize", () => {
    test("should initialize event successfully", async () => {
      const response = await request(app).post("/initialize").send({
        name: "Summer Concert",
        totalTickets: 100,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Summer Concert");
      expect(response.body.data.totalTickets).toBe(100);
      expect(response.body.data.availableTickets).toBe(100);
      expect(response.body.data.id).toBeDefined();
    });

    test("should validate required fields", async () => {
      const response = await request(app).post("/initialize").send({
        name: "Concert",
        // Missing totalTickets
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Validation Error");
    });

    test("should validate totalTickets is positive", async () => {
      const response = await request(app).post("/initialize").send({
        name: "Concert",
        totalTickets: -10,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============= BOOK TICKET TESTS =============

  describe("POST /book", () => {
    let eventId;

    beforeEach(async () => {
      const event = await Event.create({
        name: "Test Event",
        totalTickets: 2,
        availableTickets: 2,
      });
      eventId = event.id;
    });

    test("should book ticket successfully", async () => {
      const response = await request(app).post("/book").send({
        eventId,
        userId: "user1",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("confirmed");
      expect(response.body.message).toBe("Ticket booked successfully");
    });

    test("should add to waiting list when sold out", async () => {
      // Book all tickets
      await request(app).post("/book").send({ eventId, userId: "user1" });
      await request(app).post("/book").send({ eventId, userId: "user2" });

      // Third user goes to waiting
      const response = await request(app).post("/book").send({
        eventId,
        userId: "user3",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("waiting");
      expect(response.body.message).toContain("waiting list");
    });

    test("should validate required fields", async () => {
      const response = await request(app).post("/book").send({
        eventId,
        // Missing userId
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Validation Error");
    });

    test("should handle invalid event ID", async () => {
      const response = await request(app).post("/book").send({
        eventId: "invalid-uuid",
        userId: "user1",
      });

      expect(response.status).toBe(400);
    });

    test("should prevent duplicate bookings", async () => {
      await request(app).post("/book").send({
        eventId,
        userId: "user1",
      });

      const response = await request(app).post("/book").send({
        eventId,
        userId: "user1",
      });

      expect(response.status).toBe(500); // Error from service
      expect(response.body.success).toBe(false);
    });
  });

  // ============= CANCEL BOOKING TESTS =============

  describe("POST /cancel", () => {
    let eventId;

    beforeEach(async () => {
      const event = await Event.create({
        name: "Test Event",
        totalTickets: 2,
        availableTickets: 2,
      });
      eventId = event.id;

      // Book a ticket
      await request(app).post("/book").send({
        eventId,
        userId: "user1",
      });
    });

    test("should cancel booking successfully", async () => {
      const response = await request(app).post("/cancel").send({
        eventId,
        userId: "user1",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cancelledBooking.status).toBe("cancelled");
    });

    test("should auto-assign waiting user", async () => {
      // Book all tickets
      await request(app).post("/book").send({ eventId, userId: "user2" });

      // Add to waiting
      await request(app).post("/book").send({
        eventId,
        userId: "user3",
      });

      // Cancel first booking
      const response = await request(app).post("/cancel").send({
        eventId,
        userId: "user1",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedUser).toBeDefined();
      expect(response.body.data.assignedUser.userId).toBe("user3");
      expect(response.body.data.assignedUser.status).toBe("confirmed");
    });

    test("should validate required fields", async () => {
      const response = await request(app).post("/cancel").send({
        eventId,
        // Missing userId
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============= GET STATUS TESTS =============

  describe("GET /status/:eventId", () => {
    let eventId;

    beforeEach(async () => {
      const event = await Event.create({
        name: "Test Event",
        totalTickets: 5,
        availableTickets: 5,
      });
      eventId = event.id;

      // Create some bookings
      await request(app).post("/book").send({ eventId, userId: "user1" });
      await request(app).post("/book").send({ eventId, userId: "user2" });
      await request(app).post("/book").send({ eventId, userId: "user3" });
      await request(app).post("/book").send({ eventId, userId: "user4" });
      await request(app).post("/book").send({ eventId, userId: "user5" });
      // Add to waiting
      await request(app).post("/book").send({ eventId, userId: "user6" });
    });

    test("should return event status", async () => {
      const response = await request(app).get(`/status/${eventId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBe(eventId);
      expect(response.body.data.availableTickets).toBe(0);
      expect(response.body.data.bookedTickets).toBe(5);
      expect(response.body.data.waitingListCount).toBe(1);
    });

    test("should handle invalid event ID", async () => {
      const response = await request(app).get("/status/invalid-uuid-format");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test("should return not found for non-existent event", async () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      const response = await request(app).get(`/status/${validUUID}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ============= END-TO-END WORKFLOW TESTS =============

  describe("End-to-End Workflows", () => {
    test("complete booking workflow", async () => {
      // 1. Initialize event
      const initResponse = await request(app).post("/initialize").send({
        name: "Full Workflow Test",
        totalTickets: 3,
      });
      const eventId = initResponse.body.data.id;

      // 2. Book tickets
      const booking1 = await request(app).post("/book").send({
        eventId,
        userId: "alice",
      });
      expect(booking1.body.data.status).toBe("confirmed");

      const booking2 = await request(app).post("/book").send({
        eventId,
        userId: "bob",
      });
      expect(booking2.body.data.status).toBe("confirmed");

      const booking3 = await request(app).post("/book").send({
        eventId,
        userId: "charlie",
      });
      expect(booking3.body.data.status).toBe("confirmed");

      // 3. Check status - all sold
      const status1 = await request(app).get(`/status/${eventId}`);
      expect(status1.body.data.availableTickets).toBe(0);
      expect(status1.body.data.bookedTickets).toBe(3);

      // 4. Add to waiting list
      const waitingBooking = await request(app).post("/book").send({
        eventId,
        userId: "diana",
      });
      expect(waitingBooking.body.data.status).toBe("waiting");

      // 5. Check status - 1 waiting
      const status2 = await request(app).get(`/status/${eventId}`);
      expect(status2.body.data.waitingListCount).toBe(1);

      // 6. Cancel booking
      const cancelResponse = await request(app).post("/cancel").send({
        eventId,
        userId: "alice",
      });
      expect(cancelResponse.body.data.assignedUser.userId).toBe("diana");

      // 7. Verify waiting user is now confirmed
      const status3 = await request(app).get(`/status/${eventId}`);
      expect(status3.body.data.availableTickets).toBe(0);
      expect(status3.body.data.bookedTickets).toBe(3);
      expect(status3.body.data.waitingListCount).toBe(0);
    });
  });

  // ============= CONCURRENT REQUESTS =============

  describe("Concurrent API Requests", () => {
    test("should handle 50 concurrent booking requests", async () => {
      const event = await Event.create({
        name: "Concurrent API Test",
        totalTickets: 25,
        availableTickets: 25,
      });

      const bookingPromises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post("/book")
          .send({
            eventId: event.id,
            userId: `user${i + 1}`,
          })
      );

      const responses = await Promise.all(bookingPromises);

      // Check that exactly 25 are confirmed
      const confirmed = responses.filter(
        (r) => r.body.data.status === "confirmed"
      );
      const waiting = responses.filter((r) => r.body.data.status === "waiting");

      expect(confirmed.length).toBe(25);
      expect(waiting.length).toBe(25);

      // Verify final state
      const status = await request(app).get(`/status/${event.id}`);
      expect(status.body.data.availableTickets).toBe(0);
      expect(status.body.data.bookedTickets).toBe(25);
      expect(status.body.data.waitingListCount).toBe(25);
    });
  });

  // ============= ERROR HANDLING TESTS =============

  describe("Error Handling", () => {
    test("GET /nonexistent should return 404", async () => {
      const response = await request(app).get("/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Route not found");
      expect(response.body.path).toBe("/nonexistent");
    });

    test("POST /initialize with invalid data should return error", async () => {
      const response = await request(app).post("/initialize").send({
        name: "", // Empty name
        totalTickets: 100,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("POST /book with missing eventId should return error", async () => {
      const response = await request(app).post("/book").send({
        userId: "user1",
        // Missing eventId
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("POST /book with missing userId should return error", async () => {
      const response = await request(app).post("/book").send({
        eventId: "some-id",
        // Missing userId
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("POST /cancel with non-existent event should return error", async () => {
      const response = await request(app).post("/cancel").send({
        eventId: "00000000-0000-0000-0000-000000000000",
        userId: "user1",
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test("GET /status with invalid UUID should return error", async () => {
      const response = await request(app).get("/status/invalid-uuid");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test("POST /initialize with negative tickets should return error", async () => {
      const response = await request(app).post("/initialize").send({
        name: "Invalid Event",
        totalTickets: -5,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("POST /book on non-existent event should return error", async () => {
      const response = await request(app).post("/book").send({
        eventId: "00000000-0000-0000-0000-000000000000",
        userId: "user1",
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test("POST /cancel on non-existent event should return error", async () => {
      const response = await request(app).post("/cancel").send({
        eventId: "00000000-0000-0000-0000-000000000000",
        userId: "user1",
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
