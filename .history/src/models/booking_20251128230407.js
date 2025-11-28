import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Event from "./event.js";
import { formatDateReadable } from "../utils/dateFormatter.js";

/**
                                Booking Model
 WHAT IT REPRESENTS:
 - A user's attempt to book a ticket
 - It tracks the status of each booking
 
  FIELDS:
  - id: Unique booking ID
  - eventId: Foreign key to Event (which event is this booking for?)
  - userId: The ID of the user attempting to book (e.g. "user-123")
  - booking statuses:
       'confirmed': User successfully got a ticket
       'waiting': User is on waiting list (no ticket yet)
       'cancelled': User cancelled their booking
  -position: Position in waiting list (this is only relevant if status='waiting')
  -bookedAt: When the booking was made
 
  how the flow goes;
 User books : Booking created with status='confirmed'
 Event is sold out : New booking has status='waiting'
 User from 'confirmed' cancels : Their booking becomes 'cancelled'
 Next 'waiting' booking becomes 'confirmed'
 */

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Event,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    status: {
      type: DataTypes.ENUM("confirmed", "waiting", "cancelled"),
      allowNull: false,
      defaultValue: "waiting",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bookedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: "bookings",
    indexes: [
      {
        fields: ["eventId", "userId"],
        unique: false,
      },
      {
        fields: ["eventId", "status"],
        unique: false,
      },
    ],
  }
);

export default Booking;
