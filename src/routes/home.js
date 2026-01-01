import express from "express";
import FurnitureItem from "../models/FurnitureItem.js";
import FurnitureSet from "../models/FurnitureSet.js";
import Room from "../models/Room.js";

const router = express.Router();

const SIGNATURE_ITEMS_CODES = [
  "LR-04", "BR-28", "DR-05", "SM-039", "LR-06", "LR-008", "BR-23", "LR-012", "ST-053", "BR-21", "SR-039", "DR-17", "DR-03", "SR-024", "SR-066"
];

const FEATURED_ITEMS_CODES = [
  "LM-011", "ST-011", "LR-011", "LM-018", "SR-060", "LR-004", "ST-051", "LT-010", "LR-010", "SR-062", "LT-008", "SR-085"
];

const FEATURED_SETS_CODES = [
  "OT-02", "LR-01", "BT-27", "DM-01", "OT-08", "BR-06", "BT-13", "DM-09", "LR-02", "DR-06"
];

router.get("/", async (req, res) => {
  try {
    const featuredItemsRaw = await FurnitureItem.find({
      code: { $in: SIGNATURE_ITEMS_CODES },
    });
    // Sort items to match SIGNATURE_ITEMS_CODES order
    const featuredItems = SIGNATURE_ITEMS_CODES.map(code =>
      featuredItemsRaw.find(item => item.code === code)
    ).filter(Boolean);

    const carouselItemsRaw = await FurnitureItem.find({
      code: { $in: FEATURED_ITEMS_CODES },
    });
    // Sort items to match FEATURED_ITEMS_CODES order
    const carouselItems = FEATURED_ITEMS_CODES.map(code =>
      carouselItemsRaw.find(item => item.code === code)
    ).filter(Boolean);

    const carouselSetsRaw = await FurnitureSet.find({
      code: { $in: FEATURED_SETS_CODES },
    });
    // Sort sets to match FEATURED_SETS_CODES order
    const carouselSets = FEATURED_SETS_CODES.map(code =>
      carouselSetsRaw.find(set => set.code === code)
    ).filter(Boolean);

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
