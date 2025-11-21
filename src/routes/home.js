import express from "express";
import FurnitureItem from "../models/FurnitureItem.js";
import FurnitureSet from "../models/FurnitureSet.js";
import Room from "../models/Room.js";

const router = express.Router();

const FEATURED_ITEMS = [
  "traditional-sofa",
  "traditional-table",
  "modern-side-table",
  "traditional-bench",
  "royal-table",
  "royal-console",
];

const FEATURED_SETS = [
  "royal-bedroom-set",
  "traditional-dining-room-set",
  "royal-office-set",
  "royal-showpieces-set",
  "traditional-living-room-set",
  "modern-bedroom-set"
];

const CAROUSEL_ITEMS_SLUGS = [
  "traditional-chair",
  "traditional-side-table",
  "traditional-console",
  "modern-table",
  "royal-bench",
  "royal-cabinet",
  "modern-console"
];

const CAROUSEL_SETS_SLUGS = [
  "royal-bedroom-set",
  "traditional-dining-room-set",
  "royal-office-set",
  "royal-showpieces-set",
  "traditional-living-room-set",
  "modern-bedroom-set"
];

router.get("/", async (req, res) => {
  try {
    const featuredItems = await FurnitureItem.find({
      slug: { $in: FEATURED_ITEMS },
    });

    const featuredSets = await FurnitureSet.find({
      slug: { $in: FEATURED_SETS },
    });

    const carouselItems = await FurnitureItem.find({
      slug: { $in: CAROUSEL_ITEMS_SLUGS },
    });

    const carouselSets = await FurnitureSet.find({
      slug: { $in: CAROUSEL_SETS_SLUGS },
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
      featuredSets,
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
