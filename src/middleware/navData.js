import Room from "../models/Room.js";
import FurnitureItem from "../models/FurnitureItem.js";

// Middleware to fetch navigation data for the header dropdown
export const navDataMiddleware = async (req, res, next) => {
  try {
    // Fetch all rooms as plain objects
    const rooms = await Room.find()
      .select("name slug")
      .sort({ name: 1 })
      .lean();

    // Fetch distinct types for each room
    const roomsWithTypes = await Promise.all(
      rooms.map(async (room) => {
        // Get unique types for this room (e.g., ['Sofa', 'Chair', 'Table'])
        const types = await FurnitureItem.find({ room: room.name }).distinct("type");

        // Sort types alphabetically
        types.sort();

        return { ...room, types };
      })
    );

    // Make data available to all views
    res.locals.navRooms = roomsWithTypes;

    next();
  } catch (error) {
    console.error("Error fetching navigation data:", error);
    // Continue even if there's an error, just with empty arrays
    res.locals.navRooms = [];
    next();
  }
};
