'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('waiting_lists', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      eventId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'events', // Reference the 'events' table name
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      status: {
        type: Sequelize.ENUM('waiting', 'assigned'),
        allowNull: false,
        defaultValue: 'waiting',
      },
      createdAt: { // Sequelize adds these automatically
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: { // Sequelize adds these automatically
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes manually
    await queryInterface.addIndex('waiting_lists', ['eventId', 'position'], {
        unique: true
    });
    await queryInterface.addIndex('waiting_lists', ['eventId', 'userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('waiting_lists');
  }
};
