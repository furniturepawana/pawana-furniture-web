import Room from "../models/Room.js";
import FurnitureItem from "../models/FurnitureItem.js";
import SiteSettings from "../models/SiteSettings.js";
import { getOrSet } from "../utils/cache.js";

// Middleware to fetch navigation data for the header dropdown
export const navDataMiddleware = async (req, res, next) => {
  try {
    // Cache navigation data for 5 minutes (runs on every request)
    const roomsWithTypes = await getOrSet('nav:rooms', async () => {
      // Fetch all rooms as plain objects
      const rooms = await Room.find()
        .select("name slug")
        .lean();

      // Define custom room order
      const roomOrder = ['Living Room', 'Dining Room', 'Bedroom', 'Office', 'Showpieces'];

      // Sort rooms based on custom order
      rooms.sort((a, b) => {
        const indexA = roomOrder.indexOf(a.name);
        const indexB = roomOrder.indexOf(b.name);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      // Fetch distinct types for each room
      return await Promise.all(
        rooms.map(async (room) => {
          const types = await FurnitureItem.find({ room: room.name }).distinct("type");
          types.sort();
          return { ...room, types };
        })
      );
    }, 300);

    // Fetch site settings (for formEmail and other shared settings)
    const settings = await SiteSettings.getSettings();

    // Make data available to all views
    res.locals.navRooms = roomsWithTypes;
    res.locals.contactSettings = settings.contact;
    res.locals.footerSettings = settings.home?.footer || {
      tagline1: 'We Turn Your Imagination Into Reality',
      tagline2: 'Redefining luxury interiors with timeless design and sustainable practices. Since 1980',
      copyright: `© ${new Date().getFullYear()} Pawana Furniture. All rights reserved.`
    };
    next();
  } catch (error) {
    console.error("Error fetching navigation data:", error);
    res.locals.navRooms = [];
    res.locals.contactSettings = { formEmail: "furniturepawana@gmail.com" };
    next();
  }
};
