# Postman Testing Guide - Event Ticket Booking System

## Server Info

- **Base URL:** `http://localhost:3000`
- **Content-Type:** `application/json`
- **Method:** POST for state-changing, GET for reading

---

## ✅ STEP 1: Health Check (Verify Server Running)

### Request

```
GET http://localhost:3000/health
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "28 Nov 2025 at 21:10:58 UTC"
}
```

---

## ✅ STEP 2: Initialize Event (Create Event with Tickets)

This is the FIRST operation - creates an event with available tickets.

### Request

```
POST http://localhost:3000/initialize
Content-Type: application/json

{
  "name": "Nigeria ",
  "totalTickets": 5
}
```

### Expected Response (201 Created)

```json
{
  "success": true,
  "message": "Event initialized successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Taylor Swift Concert",
    "totalTickets": 5,
    "availableTickets": 5,
    "createdAt": "28 Nov 2025 at 21:11:00 UTC",
    "updatedAt": "28 Nov 2025 at 21:11:00 UTC"
  }
}
```

### ⚠️ SAVE THIS EVENT ID - You'll need it for all other tests!

Example: `550e8400-e29b-41d4-a716-446655440000`

---

## ✅ STEP 3: Book Tickets (Confirm Booking)

Book tickets for users. Since we created 5 tickets, first 5 bookings will be CONFIRMED.

### Request 1: User 1 Books

```
POST http://localhost:3000/book
Content-Type: application/json

{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user1"
}
```

### Expected Response (201 Created) - CONFIRMED

```json
{
  "success": true,
  "message": "Ticket booked successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user1",
    "status": "confirmed",
    "position": null,
    "bookedAt": "28 Nov 2025 at 21:11:05 UTC"
  }
}
```

### Request 2-5: Repeat for Users 2-5 (All Will be CONFIRMED)

```
POST http://localhost:3000/book
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user2"
}
```

Change userId to `user2`, `user3`, `user4`, `user5`

**All 5 will respond with status: "confirmed"**

---

## ✅ STEP 4: Add Users to Waiting List (Overbooking)

Now all tickets are sold. New bookings go to WAITING LIST.

### Request 6: User 6 Joins Waiting List

```
POST http://localhost:3000/book
Content-Type: application/json

{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user6"
}
```

### Expected Response (201 Created) - WAITING at Position 1

```json
{
  "success": true,
  "message": "Added to waiting list at position 1",
  "data": {
    "id": "456e7890-f12c-34e5-b789-534725285111",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user6",
    "status": "waiting",
    "position": 1,
    "bookedAt": "28 Nov 2025 at 21:11:10 UTC"
  }
}
```

### Request 7: User 7 Joins Waiting List

```
POST http://localhost:3000/book
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user7"
}
```

### Expected Response - WAITING at Position 2

```json
{
  "success": true,
  "message": "Added to waiting list at position 2",
  "data": {
    "status": "waiting",
    "position": 2,
    "userId": "user7"
  }
}
```

---

## ✅ STEP 5: Check Event Status

Get real-time status showing available tickets, booked count, and waiting list count.

### Request

```
GET http://localhost:3000/status/550e8400-e29b-41d4-a716-446655440000
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "data": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "eventName": "Taylor Swift Concert",
    "totalTickets": 5,
    "availableTickets": 0,
    "bookedTickets": 5,
    "waitingListCount": 2,
    "timestamp": "28 Nov 2025 at 21:11:15 UTC"
  }
}
```

**Key Insight:**

- Available: 0 (all sold)
- Booked: 5 (confirmed users)
- Waiting: 2 (user6, user7)

---

## ✅ STEP 6: Cancel Booking (Trigger Auto-Assignment)

When someone cancels, the next waiting user AUTOMATICALLY gets their ticket.

### Request: User 1 Cancels

```
POST http://localhost:3000/cancel
Content-Type: application/json

{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user1"
}
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "cancelledBooking": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "user1",
      "status": "cancelled",
      "eventId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "assignedUser": {
      "userId": "user6",
      "status": "confirmed",
      "eventId": "550e8400-e29b-41d4-a716-446655440000",
      "message": "Auto-assigned from waiting list"
    }
  }
}
```

**What Happened:**

- user1's booking: CANCELLED
- user6: AUTO-ASSIGNED from waiting list (position 1 → confirmed)
- user7: Remains waiting (but position should be updated)

---

## ✅ STEP 7: Verify Auto-Assignment (Check Status Again)

### Request

```
GET http://localhost:3000/status/550e8400-e29b-41d4-a716-446655440000
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "data": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "eventName": "Taylor Swift Concert",
    "totalTickets": 5,
    "availableTickets": 0,
    "bookedTickets": 5,
    "waitingListCount": 1,
    "timestamp": "28 Nov 2025 at 21:11:20 UTC"
  }
}
```

**Changes:**

- Booked: Still 5 (user1 cancelled, user6 auto-assigned)
- Waiting: 1 (only user7 remains)

---

## ✅ STEP 8: Test Error Scenarios

### A. Try to Book Invalid Event

```
POST http://localhost:3000/book
{
  "eventId": "00000000-0000-0000-0000-000000000000",
  "userId": "user10"
}
```

### Expected Response (500 Error)

```json
{
  "success": false,
  "error": "Event not found"
}
```

### B. Try to Book Without Event ID

```
POST http://localhost:3000/book
{
  "userId": "user10"
}
```

### Expected Response (400 Bad Request)

```json
{
  "success": false,
  "error": "\"eventId\" is required"
}
```

### C. Try to Book Same Event Twice (Same User)

```
POST http://localhost:3000/book
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user2"
}
```

### Expected Response (500 Error)

```json
{
  "success": false,
  "error": "User already has active booking for this event"
}
```

### D. Try to Cancel Non-Existent Booking

```
POST http://localhost:3000/cancel
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user10"
}
```

### Expected Response (500 Error)

```json
{
  "success": false,
  "error": "No confirmed booking found for this user"
}
```

### E. Try to Access Non-Existent Route

```
GET http://localhost:3000/nonexistent
```

### Expected Response (404 Not Found)

```json
{
  "success": false,
  "error": "Route not found",
  "path": "/nonexistent"
}
```

---

## ✅ STEP 9: Test Invalid Input Validation

### A. Initialize with Empty Name

```
POST http://localhost:3000/initialize
{
  "name": "",
  "totalTickets": 10
}
```

### Expected Response (400 Bad Request)

```json
{
  "success": false,
  "error": "\"name\" is not allowed to be empty"
}
```

### B. Initialize with Negative Tickets

```
POST http://localhost:3000/initialize
{
  "name": "Another Concert",
  "totalTickets": -5
}
```

### Expected Response (400 Bad Request)

```json
{
  "success": false,
  "error": "\"totalTickets\" must be greater than or equal to 1"
}
```

### C. Initialize with Zero Tickets

```
POST http://localhost:3000/initialize
{
  "name": "Zero Tickets Event",
  "totalTickets": 0
}
```

### Expected Response (400 Bad Request)

```json
{
  "success": false,
  "error": "\"totalTickets\" must be greater than or equal to 1"
}
```

---

## ✅ STEP 10: Test Complete Workflow (Create New Event)

Let's test the complete flow with a NEW event:

### 1. Initialize

```
POST http://localhost:3000/initialize
{
  "name": "Concert 2025",
  "totalTickets": 3
}
```

**Save this new eventId**

### 2. Book 3 Users (All Confirmed)

- Book user20
- Book user21
- Book user22

### 3. Add 2 Users to Waiting

- Book user23 → Waiting position 1
- Book user24 → Waiting position 2

### 4. Check Status

- Should show: 0 available, 3 booked, 2 waiting

### 5. Cancel user20

- user23 should auto-assign

### 6. Check Status Again

- Should show: 0 available, 3 booked, 1 waiting (user24)

### 7. Cancel user21

- user24 should auto-assign

### 8. Check Status Final

- Should show: 0 available, 3 booked, 0 waiting

---

## Summary Table

| Operation        | Method | Endpoint    | Status | Notes             |
| ---------------- | ------ | ----------- | ------ | ----------------- |
| Health Check     | GET    | /health     | 200    | Server running    |
| Initialize       | POST   | /initialize | 201    | Creates event     |
| Book (Available) | POST   | /book       | 201    | Status: confirmed |
| Book (Sold Out)  | POST   | /book       | 201    | Status: waiting   |
| Get Status       | GET    | /status/:id | 200    | Real-time counts  |
| Cancel           | POST   | /cancel     | 200    | Auto-assigns      |
| Invalid Route    | GET    | /\*         | 404    | Route not found   |

---

## Key Testing Tips

1. **Always save EventId** - You'll need it for all other operations
2. **Use fresh userIds** - Each test, use different user numbers (user1, user2, etc.)
3. **Check status between operations** - Verify state changes
4. **Try error scenarios** - Invalid IDs, missing fields, duplicates
5. **Test cancellation workflow** - Most complex feature

---

## Testing Checklist

- [ ] Health check works
- [ ] Create event successfully
- [ ] Book first 5 users (all confirmed)
- [ ] Book users 6-7 (all waiting)
- [ ] Status shows 0 available, 5 booked, 2 waiting
- [ ] Cancel user1 (user6 auto-assigns)
- [ ] Status shows user6 confirmed, user7 still waiting
- [ ] Try booking invalid event (error)
- [ ] Try duplicate booking (error)
- [ ] Try canceling non-existent booking (error)
- [ ] Access invalid route (404)
- [ ] Initialize with invalid data (400)
