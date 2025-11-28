import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import { formatDateReadable } from "../utils/dateFormatter.js";

/**
 Event Model
 - WHAT IT REPRESENTS:
  An event with tickets (like a concert, movie, etc)
 I tstores metadata about the event
 
FIELDS:
 id: Unique identifier (UUID)
 name: Event name (e.g "Nigeria vs Congo football match")
 totalTickets: Total tickets created for this event (e.g 1000)
 availableTickets: Remaining tickets available (decreases as people book)
 createdAt/updatedAt: Timestamps (it is automatically managed by Sequelize)
 
 How it works:
 when event is created : availableTickets = totalTickets
 when user books : availableTickets decreases by 1
 when user cancels : availableTickets increases by 1
 */

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    totalTickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        isInt: true,
      },
    },
    availableTickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        isInt: true,
      },
    },
  },
  {
    timestamps: true,
    tableName: "events",
    hooks: {
      afterFind(result) {
        if (!result) return result;

        // Handle both single result and array of results
        const formatInstance = (instance) => {
          if (instance && instance.dataValues) {
            if (instance.dataValues.createdAt) {
              instance.dataValues.createdAt = formatDateReadable(
                instance.dataValues.createdAt
              );
            }
            if (instance.dataValues.updatedAt) {
              instance.dataValues.updatedAt = formatDateReadable(
                instance.dataValues.updatedAt
              );
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

export default Event;
