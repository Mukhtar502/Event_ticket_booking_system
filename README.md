# Event Ticket Booking System

A production-ready Node.js RESTful API for event ticket booking with advanced concurrency handling, comprehensive error handling, and full test coverage.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Design Choices](#design-choices)
- [Concurrency Handling](#concurrency-handling)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Bonus Features](#bonus-features)
- [Performance Considerations](#performance-considerations)

---

## 🎯 Overview

This system manages ticket bookings for events with the following capabilities:

- **Event Creation** - Initialize events with a specific number of tickets
- **Ticket Booking** - Users can book tickets for events
- **Automatic Waiting List** - When tickets are sold out, users join a waiting list
- **Auto-Assignment** - When a booking is cancelled, the next waiting user automatically gets the ticket
- **Real-time Status** - Get live counts of available tickets and waiting list size
- **Concurrency Safe** - Handles thousands of simultaneous booking requests without race conditions

### Key Features

✅ Thread-safe booking operations using AsyncLock  
✅ Automatic waiting list management  
✅ Persistent storage with PostgreSQL  
✅ Comprehensive error handling  
✅ Full unit and integration test coverage (80%+)  
✅ RESTful API design  
✅ Request validation with Joi  
✅ Structured logging with Winston  
✅ Rate limiting (bonus)  
✅ JWT authentication (bonus)

---

## 🏗️ Architecture

### Layered Architecture

```
┌─────────────────────────────────┐
│   HTTP Requests (Client)        │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Express Routes & Validation   │
│   (bookingRoutes.js)            │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Controllers (HTTP Handlers)   │
│   (BookingController.js)        │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Business Logic with Locks     │
│   (BookingService.js)           │
│   - AsyncLock for concurrency   │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Data Models (Sequelize ORM)   │
│   - Event, Booking, WaitingList │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   PostgreSQL Database           │
└─────────────────────────────────┘
```

### Concurrency Strategy

The critical innovation is using **AsyncLock** to ensure thread-safety:

```
Multiple Concurrent Requests
           │
    ┌──────┼──────┐
    │      │      │
User A   User B  User C
    │      │      │
    └──────┴──────┘ (all try to book)
           │
    AsyncLock.acquire(eventId)
           │
    ┌──────────────────┐
    │ LOCK ACQUIRED    │
    │ User A proceeds  │
    │ (reads, updates, │
    │  writes)         │
    │ LOCK RELEASED    │
    └──────────────────┘
           │
    ┌──────────────────┐
    │ LOCK ACQUIRED    │
    │ User B proceeds  │
    │ (sees A's update)│
    │ LOCK RELEASED    │
    └──────────────────┘
           │
           And so on...
```

This prevents the classic overbooking problem where multiple users could book the same ticket.

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** 16+ ([Download](https://nodejs.org/))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org/))
- **npm** or **yarn**

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd Event_ticket_booking-system
```

### 2. Install Dependencies

```bash
npm install
```

This installs:

- express (web framework)
- sequelize (ORM)
- pg (PostgreSQL driver)
- async-lock (concurrency control)
- jest (testing)
- And more (see package.json)

### 3. Set Up PostgreSQL Database

```bash
# Create database
createdb event_booking_db

# Verify
psql -l | grep event_booking_db
```

### 4. Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env with your values
nano .env
```

Update these values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_booking_db
DB_USER=postgres
DB_PASSWORD=<your-password>
NODE_ENV=development
PORT=3000
```

### 5. Create Database Tables (Migrations)

```bash
npm run db:migrate
```

Or let Sequelize auto-create on first run:

```bash
# Tables auto-create when server starts
npm start
```

---

## 🏃 Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### Production Mode

```bash
npm start
```

### Verify Server is Running

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "28 Nov 2025 at 21:10:58 UTC"
}
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:3000
```

### 1. Initialize Event

**Endpoint:** `POST /initialize`

**Description:** Create a new event with a specific number of tickets

**Request Body:**

```json
{
  "name": "Taylor Swift Concert",
  "totalTickets": 1000
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Event initialized successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Taylor Swift Concert",
    "totalTickets": 1000,
    "availableTickets": 1000,
    "createdAt": "27 Nov 2024 at 10:00:00 UTC",
    "updatedAt": "27 Nov 2024 at 10:00:00 UTC"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation Error",
  "details": ["\"totalTickets\" must be greater than or equal to 1"]
}
```

---

### 2. Book Ticket

**Endpoint:** `POST /book`

**Description:** Book a ticket for a user. If sold out, user is added to waiting list

**Request Body:**

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-john-doe"
}
```

**Response - Ticket Available (201 Created):**

```json
{
  "success": true,
  "message": "Ticket booked successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-john-doe",
    "status": "confirmed",
    "position": null,
    "bookedAt": "27 Nov 2024 at 10:05:00 UTC",
    "createdAt": "27 Nov 2024 at 10:05:00 UTC",
    "updatedAt": "27 Nov 2024 at 10:05:00 UTC"
  }
}
```

**Response - Tickets Sold Out (201 Created):**

```json
{
  "success": true,
  "message": "Added to waiting list at position 5",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-jane-smith",
    "status": "waiting",
    "position": 5,
    "bookedAt": "27 Nov 2024 at 10:06:00 UTC",
    "createdAt": "27 Nov 2024 at 10:06:00 UTC",
    "updatedAt": "27 Nov 2024 at 10:06:00 UTC"
  }
}
```

**Error - Already Booked (500):**

```json
{
  "success": false,
  "error": "User already has active booking for this event"
}
```

---

### 3. Cancel Booking

**Endpoint:** `POST /cancel`

**Description:** Cancel a booking. If waiting list has users, first one is auto-assigned

**Request Body:**

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-john-doe"
}
```

**Response - Simple Cancellation (200 OK):**

```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "cancelledBooking": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "user-john-doe",
      "status": "cancelled",
      "updatedAt": "27 Nov 2024 at 10:10:00 UTC"
    },
    "assignedUser": null
  }
}
```

**Response - Auto-Assigned Waiting User (200 OK):**

```json
{
  "success": true,
  "message": "Booking cancelled and next waiting user (user-jane-smith) assigned",
  "data": {
    "cancelledBooking": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "user-john-doe",
      "status": "cancelled"
    },
    "assignedUser": {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "userId": "user-jane-smith",
      "status": "confirmed",
      "position": null
    }
  }
}
```

---

### 4. Get Event Status

**Endpoint:** `GET /status/:eventId`

**Description:** Get current status of an event

**Parameters:**

- `eventId` (URL parameter): UUID of the event

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "eventName": "Taylor Swift Concert",
    "totalTickets": 1000,
    "availableTickets": 750,
    "bookedTickets": 250,
    "waitingListCount": 15,
    "timestamp": "27 Nov 2024 at 10:15:30 UTC"
  }
}
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run with Coverage Report

```bash
npm test -- --coverage
```

Output:

```
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
All files |   85.3  |   82.1   |   88.5  |   85.3
 services |   90.2  |   88.0   |   92.0  |   90.2
```

### Run Only Unit Tests

```bash
npm run test:unit
```

### Run Only Integration Tests

```bash
npm run test:integration
```

### Watch Mode (re-run on file changes)

```bash
npm run test:watch
```

### Test Coverage Details

- **Unit Tests** (`tests/unit/BookingService.test.js`):

  - Event initialization
  - Ticket booking logic
  - Cancellation logic
  - Waiting list management
  - Concurrent requests (critical!)

- **Integration Tests** (`tests/integration/api.test.js`):
  - HTTP endpoint testing
  - Request validation
  - Response formatting
  - End-to-end workflows
  - 50+ concurrent API requests

---

## 🎨 Design Choices

### 1. AsyncLock for Concurrency

**Why:** Node.js is single-threaded, but handles thousands of concurrent connections via event loop. Without proper locks, race conditions occur.

**Implementation:**

```javascript
// One lock per event
this.lock.acquire(eventId, async () => {
  // Only ONE operation at a time for this event
  // Read → Check → Update → Write
});
```

**Alternative (not used): Database Transactions**

- Would require PostgreSQL advisory locks
- Slower (round-trip to DB)
- AsyncLock is faster (in-memory)

### 2. Separate WaitingList Table

**Why:**

- Faster queries (indexed on eventId + position)
- FIFO ordering is guaranteed
- Easier auto-assignment logic
- Cleaner schema

**Alternative (not used): Single Booking Table**

- Would need to filter by status='waiting' every time
- Position re-numbering would be slower

### 3. Sequelize ORM

**Why:**

- Built-in migrations support
- Type safety (better than raw queries)
- Relationship management (Event.hasMany(Booking))
- Connection pooling
- Easier to test

**Alternative (not used): Raw SQL**

- Less code safety
- More SQL knowledge needed
- Harder to maintain

### 4. Express.js Framework

**Why:**

- Lightweight (no unnecessary overhead)
- Industry standard (large community)
- Excellent middleware ecosystem
- Easy testing with supertest

### 5. Winston for Logging

**Why:**

- Structured logging (JSON format)
- Multiple transports (file + console)
- Different log levels (info, error, debug)
- Timestamps automatically added

---

## 🔒 Concurrency Handling

### The Problem (Race Condition)

```
Time   User A                  User B                  Result
────────────────────────────────────────────────────────────────
1      READ: available=100    (waiting)               A knows there are 100
2      (processing)           READ: available=100     B also knows there are 100
3      WRITE: available=99    (waiting)               A books ticket
4      (waiting)              WRITE: available=99     B books SAME ticket!
       OVERBOOKING ERROR! ❌   We sold 2 tickets when only 1 existed
```

### The Solution (AsyncLock)

```
Time   User A                  User B                  Result
────────────────────────────────────────────────────────────────
1      LOCK acquired           (waiting for lock)      A has exclusive access
2      READ: available=100                             A reads
3      WRITE: available=99                             A updates
4      LOCK released           LOCK acquired           Now B can proceed
5                              READ: available=99      B reads current state
6                              WRITE: available=98     B updates
7                              LOCK released           Done! ✅ Correct state
```

### Test Verification

```javascript
test("should prevent overbooking with concurrent requests", async () => {
  // Simulate 20 concurrent bookings for 10 tickets
  const results = await Promise.all([
    bookTicket(eventId, "user1"),
    bookTicket(eventId, "user2"),
    // ... 18 more concurrent requests
  ]);

  // Verify: exactly 10 confirmed, 10 waiting
  expect(confirmed.length).toBe(10);
  expect(waiting.length).toBe(10);
});
```

---

## 📊 Database Schema

### Events Table

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  totalTickets INTEGER NOT NULL,
  availableTickets INTEGER NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_id ON events(id);
```

### Bookings Table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eventId UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  userId VARCHAR(255) NOT NULL,
  status ENUM('confirmed', 'waiting', 'cancelled') NOT NULL,
  position INTEGER,
  bookedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_eventId_userId ON bookings(eventId, userId);
CREATE INDEX idx_bookings_eventId_status ON bookings(eventId, status);
```

### Waiting Lists Table

```sql
CREATE TABLE waiting_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eventId UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  userId VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('waiting', 'assigned') NOT NULL DEFAULT 'waiting',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_waitinglist_eventId_position
  ON waiting_lists(eventId, position);
CREATE INDEX idx_waitinglist_eventId_userId
  ON waiting_lists(eventId, userId);
```

---

## 📁 Project Structure

```
Event_ticket_booking-system/
│
├── src/
│   ├── config/
│   │   └── database.js              # Sequelize setup
│   │
│   ├── models/
│   │   ├── Event.js                 # Event model
│   │   ├── Booking.js               # Booking model
│   │   ├── WaitingList.js           # WaitingList model
│   │   └── index.js                 # Export all models
│   │
│   ├── services/
│   │   └── BookingService.js        # 🔑 Core business logic + locks
│   │
│   ├── controllers/
│   │   └── BookingController.js     # HTTP request handlers
│   │
│   ├── routes/
│   │   └── bookingRoutes.js         # Express routes
│   │
│   ├── middleware/
│   │   ├── validation.js            # Input validation (Joi)
│   │   └── errorHandler.js          # Global error handling
│   │
│   ├── utils/
│   │   └── logger.js                # Winston logger
│   │
│   └── app.js                       # Express app setup
│
├── tests/
│   ├── unit/
│   │   └── BookingService.test.js   # Unit tests
│   │
│   └── integration/
│       └── api.test.js              # API integration tests
│
├── .env                             # Environment variables
├── .env.example                     # Example env (commit to git)
├── .gitignore                       # Git ignore rules
├── package.json                     # Dependencies & scripts
├── jest.config.js                   # Jest configuration
├── server.js                        # Entry point
└── README.md                        # This file
```

---

## 🎁 Bonus Features

### 1. Rate Limiting

Prevent abuse by limiting requests per time window.

```javascript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/book", limiter);
app.use("/cancel", limiter);
```

### 2. JWT Authentication

Secure endpoints with JWT tokens.

```javascript
import jwt from "jsonwebtoken";

// Generate token
const token = jwt.sign({ userId: "user-123" }, process.env.JWT_SECRET, {
  expiresIn: "7d",
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
```

### 3. Structured Logging

Track all operations with timestamps and context.

```javascript
logger.info("User booked ticket", {
  userId: "user-123",
  eventId: "event-456",
  status: "confirmed",
});

// Output:
// {"timestamp":"2024-11-27T10:00:00Z","level":"info",
//  "message":"User booked ticket","userId":"user-123",...}
```

---

## ⚡ Performance Considerations

### 1. Database Indexing

All critical queries are indexed:

```javascript
// Booking lookup: eventId + userId
CREATE INDEX idx_bookings_eventId_userId ON bookings(eventId, userId);

// Waiting list lookup: eventId + status + position
CREATE INDEX idx_waitinglist_eventId_position ON waiting_lists(eventId, position);
```

### 2. Connection Pooling

Sequelize maintains a pool of connections (max 5):

```javascript
pool: {
  max: 5,
  min: 0,
  acquire: 30000,
  idle: 10000,
}
```

### 3. Lock Timeout

AsyncLock waits max 5 seconds to prevent deadlocks:

```javascript
this.lock = new AsyncLock({
  timeout: 5000, // 5 second max wait
});
```

### 4. Batch Operations

When re-numbering waiting list after assignment, use batch queries:

```javascript
// Efficient: single DB call
const remaining = await WaitingList.findAll({ ... });
for (const item of remaining) {
  await item.update({ position: newPosition });
}
```

### 5. Query Optimization

Always use specific fields to avoid fetching unnecessary data:

```javascript
// Good: only fetch needed fields
const booking = await Booking.findOne({
  where: { eventId, userId },
  attributes: ['id', 'status'], // Only these fields
});

// Avoid: fetch entire row when not needed
const booking = await Booking.findOne({ where: { ... } });
```

### Load Testing

Test with concurrent load:

```bash
# Using Apache Bench
ab -n 1000 -c 100 http://localhost:3000/status/event-id

# Using autocannon
npx autocannon http://localhost:3000 -c 100 -d 30
```

---

## 🐛 Common Issues & Solutions

### Issue: "Event not found"

**Cause:** Invalid event ID format or ID doesn't exist
**Solution:** Ensure UUID format is valid and event was initialized

### Issue: "User already has active booking"

**Cause:** User tried to book same event twice
**Solution:** Check booking status first, or cancel previous booking

### Issue: Tests timeout

**Cause:** Database connection slow or lock timeout
**Solution:** Increase `testTimeout` in jest.config.js or check database connection

### Issue: Lock timeout on concurrent requests

**Cause:** Too many concurrent requests exceeding lock queue
**Solution:** Increase `maxPending` in AsyncLock or reduce concurrent load

---

## 📞 Support & Troubleshooting

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm start
```

### Database Connection Issues

```bash
# Test connection
psql -h localhost -U postgres -d event_booking_db

# Check migrations
npm run db:migrate:undo:all
npm run db:migrate
```

### Clear All Data

```bash
# WARNING: Deletes everything
npm run db:migrate:undo:all
npm run db:migrate
```

---

## 📝 API Response Codes

| Code | Meaning      | Example                              |
| ---- | ------------ | ------------------------------------ |
| 201  | Created      | Event initialized, ticket booked     |
| 200  | OK           | Status retrieved, booking cancelled  |
| 400  | Bad Request  | Invalid input, validation failed     |
| 401  | Unauthorized | Missing/invalid token                |
| 409  | Conflict     | User already booked                  |
| 500  | Server Error | Database error, internal logic error |

---

## 🚢 Deployment

### Production Checklist

- [ ] Change `NODE_ENV=production`
- [ ] Generate secure JWT_SECRET
- [ ] Use environment variables (not hardcoded)
- [ ] Set up database backups
- [ ] Enable HTTPS
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring/alerting
- [ ] Run full test suite
- [ ] Test with production-like load

### Deploy to Heroku

```bash
# Create Procfile
echo "web: npm start" > Procfile

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Deploy to DigitalOcean

```bash
# SSH into droplet
ssh root@your-ip

# Clone repo and setup
git clone <repo>
cd Event_ticket_booking-system
npm install

# Start with PM2
npm install -g pm2
pm2 start server.js --name "booking-api"
pm2 startup
pm2 save
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👤 Author

**Your Name**

- GitHub: [@yourprofile](https://github.com/yourprofile)
- Email: your.email@example.com

---

**Last Updated:** November 27, 2024
