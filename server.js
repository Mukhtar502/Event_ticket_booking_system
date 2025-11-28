import dotenv from "dotenv";
import app from "./src/app.js";
import sequelize from "./src/config/database.js";
import logger from "./src/utils/logger.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

/**
 * Server Startup
 *
 * WHAT IT DOES:
 * 1. Connects to database
 * 2. Syncs models with database
 * 3. Starts Express server
 *
 * FLOW:
 * node server.js
 *      ↓
 * Load environment variables
 *      ↓
 * Connect to PostgreSQL
 *      ↓
 * Create/update database tables
 *      ↓
 * Start Express on PORT 3000
 *      ↓
 * Ready to accept requests!
 */

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info("Database connected successfully");

    // Sync models with database
    // force: false means don't drop existing tables
    // alter: true means adjust table structure if needed
    await sequelize.sync({ alter: true });
    logger.info("Database models synced");

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully...");
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
