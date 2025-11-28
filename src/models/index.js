/**
 * Models Index File
 *
 * WHAT IT DOES:
 * - Central place to import all models
 * - Makes it easier to reference models from other files
 *
 * USAGE:
 * Instead of: import Event from '../models/Event.js'
 * We can do: import { Event } from '../models/index.js'
 */

import Event from "./event.js";
import Booking from "./booking.js";
import WaitingList from "./waitingList.js";

export { Event, Booking, WaitingList };
