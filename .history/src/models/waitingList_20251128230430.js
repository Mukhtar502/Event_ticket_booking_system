import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Event from "./event.js";
import { formatDateReadable } from "../utils/dateFormatter.js";

/**
  WaitingList Model
 
  WHAT IT REPRESENTS:
  - A user waiting for a ticket to become available
  - Tracks queue position and timestamp (for FIFO ordering)
 
  FIELDS:
  - id: Unique ID
  - eventId: The event they are waiting for?
  - userId: The user that is waiting
  - position: Queue position (1st, 2nd, 3rd, etc.)
  - timestamp: When they joined the queue (used for ordering)
  - status: 'waiting' or 'assigned' (when assigned from cancellation)
 
  WHY SEPARATE TABLE?
  - Makes queries easier (so next waiting user can be found instantly)
  - Cleaner than searching Booking table every time
 
  LIFECYCLE:
  1. Event sells out, user tries to book
  2. WaitingList entry created with position 1
  3. Someone cancels
  4. WaitingList[0] (the first person on the queue) gets assigned (status='assigned')
  5. Waiting list positions updated for the remaining users
 **/


const WaitingList = sequelize.define(
  "WaitingList",
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
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM("waiting", "assigned"),
      allowNull: false,
      defaultValue: "waiting",
    },
  },
  {
    timestamps: true,
    tableName: "waiting_lists",
    indexes: [
      {
        fields: ["eventId", "position"],
        unique: true,
      },
      {
        fields: ["eventId", "userId"],
        unique: false,
      },
    ],
    hooks: {
      afterFind(result) {
        if (!result) return result;
        
        const formatInstance = (instance) => {
          if (instance && instance.dataValues) {
            if (instance.dataValues.createdAt) {
              instance.dataValues.createdAt = formatDateReadable(instance.dataValues.createdAt);
            }
            if (instance.dataValues.updatedAt) {
              instance.dataValues.updatedAt = formatDateReadable(instance.dataValues.updatedAt);
            }
            if (instance.dataValues.timestamp) {
              instance.dataValues.timestamp = formatDateReadable(instance.dataValues.timestamp);
            }
          }
          return instance;
        };

        if (Array.isArray(result)) {
          return result.map(formatInstance);
        }
        return formatInstance(result);
      },
    },
  }
);

export default WaitingList;
