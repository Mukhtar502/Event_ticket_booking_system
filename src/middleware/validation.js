import Joi from "joi";

/**
 * Validation Middleware
 *
 * WHAT IT DOES:
 * - Validates incoming request data using Joi schemas
 * - Returns errors if validation fails
 * - Prevents invalid data from reaching business logic
 *
 * HOW IT WORKS:
 * 1. Define schema (what fields are allowed, required types)
 * 2. Create middleware function
 * 3. Use in routes: app.post('/endpoint', validateRequest, handler)
 * 4. If invalid: return 400 with error details
 * 5. If valid: continue to next handler
 */

// Define schemas for different endpoints

export const initializeEventSchema = Joi.object({
  name: Joi.string().required().min(3).max(255),
  totalTickets: Joi.number().integer().required().min(1),
});

export const bookTicketSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
  userId: Joi.string().required().min(1).max(255),
});

export const cancelBookingSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
  userId: Joi.string().required().min(1).max(255),
});

export const eventStatusSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
});

/**
 * Middleware factory: creates validation middleware
 *
 * USAGE:
 * const validate = createValidationMiddleware(bookTicketSchema);
 * app.post('/book', validate, controllerMethod);
 */
export const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const messages = error.details.map((detail) => detail.message);
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: messages,
        });
      }

      // Replace req.body with validated and cleaned data
      req.body = value;
      next();
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Internal validation error",
      });
    }
  };
};
