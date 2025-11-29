"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("bookings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      eventId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "events", // Reference the 'events' table name
          key: "id",
        },
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("confirmed", "waiting", "cancelled"),
        allowNull: false,
        defaultValue: "waiting",
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bookedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        // Sequelize adds these automatically
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        // Sequelize adds these automatically
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("bookings");
  },
};
