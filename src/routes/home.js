import express from "express";
import FurnitureItem from "../models/FurnitureItem.js";
import FurnitureSet from "../models/FurnitureSet.js";
import Room from "../models/Room.js";

const router = express.Router();

const SIGNATURE_ITEMS_CODES = [
  // Living Room items
  "LM-011", "LM-002", "LR-007", "LR-013", "LT-019", "LT-001",
  // Bedroom, Dining, Office items for variety
  "BM-01", "BM-03", "DR-01", "DR-02", "OF-01", "OF-02",
];

const FEATURED_ITEMS_CODES = [
  "LM-005",
  "LM-008",
  "LM-014",
  "LR-017",
  "LR-009",
  "LR-004",
  "LT-011",
  "LT-024",
  "LT-010",
];

const FEATURED_SETS_CODES = [
  "LR-07",
  "LR-05",
  "LT-02",
  "LT-01",
  "LM-03",
  "LM-01",
];

router.get("/", async (req, res) => {
  try {
    const featuredItems = await FurnitureItem.find({
      code: { $in: SIGNATURE_ITEMS_CODES },
    });

    const carouselItems = await FurnitureItem.find({
      code: { $in: FEATURED_ITEMS_CODES },
    });

    const carouselSets = await FurnitureSet.find({
      code: { $in: FEATURED_SETS_CODES },
    });

    // Fetch all furniture items
    const allItems = await FurnitureItem.find().sort({ createdAt: -1 });

    // Group items by type
    const groupedItems = allItems.reduce((acc, item) => {
      const key = item.type.toLowerCase(); // e.g., 'Bed' -> 'bed'
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // Fetch all rooms for Browse by Rooms section
    const rooms = await Room.find();

    res.render("pages/home", {
      title: "Home",
      pageClass: "page-home", // Identifier for home page
      featuredItems,
      carouselItems,
      carouselSets,
      groupedItems,
      rooms,
    });
  } catch (error) {
    console.error("Error loading home page:", error);
    res.status(500).send("Server Error");
  }
});


export default router;
