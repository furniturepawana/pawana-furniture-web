import express from "express";
import FurnitureItem from "../models/FurnitureItem.js";
import FurnitureSet from "../models/FurnitureSet.js";

const router = express.Router();

// GET /catalogue - Display all items and sets with filters
router.get("/", async (req, res) => {
  try {
    const { style, room, type, view } = req.query;

    // Fetch ALL items and sets (no filtering on server side - let client handle it)
    let items = await FurnitureItem.find({});
    let sets = await FurnitureSet.find({});

    // Randomize the order
    items = items.sort(() => Math.random() - 0.5);
    sets = sets.sort(() => Math.random() - 0.5);

    // Get unique values for filters
    const roomsFromItems = await FurnitureItem.distinct("room");
    const roomsFromSets = await FurnitureSet.distinct("room");
    const allRooms = [...new Set([...roomsFromItems, ...roomsFromSets])];

    const allStyles = ["Royal", "Modern", "Traditional"];
    const allTypes = await FurnitureItem.distinct("type");

    res.render("pages/catalogue", {
      title: "Collection",
      items,
      sets,
      allRooms,
      allStyles,
      allTypes,
      filters: { style, room, type, view: view || "all" },
    });
  } catch (error) {
    console.error("Error loading catalogue page:", error);
    res.status(500).send("Server Error");
  }
});

export default router;
