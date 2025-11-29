import express from "express";
import FurnitureSet from "../models/FurnitureSet.js";

const router = express.Router();

// GET /set/:slug - Display furniture set with individual items
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const set = await FurnitureSet.findOne({ slug }).populate("items");

    if (!set) {
      return res.status(404).send("Set not found");
    }

    // Get similar sets (same room, same style) for the carousel
    const similarSets = await FurnitureSet.find({
      room: set.room,
      style: set.style,
      _id: { $ne: set._id },
    }).populate("items");

    // Get "You may also like" sets (same room, mixed styles, excluding current set)
    // We can exclude the similar sets if we want, but "mixed styles" usually implies a broader range.
    // For now, let's just get everything else in the room to ensure we have enough content.
    const youMayAlsoLikeSets = await FurnitureSet.find({
      room: set.room,
      _id: { $ne: set._id },
      // Optional: Exclude similar sets if we want strictly different styles here
      // _id: { $nin: [set._id, ...similarSets.map(s => s._id)] }
    }).limit(6).populate("items");

    res.render("pages/set", {
      title: set.name,
      set,
      similarSets,
      youMayAlsoLikeSets,
    });
  } catch (error) {
    console.error("Error loading set page:", error);
    res.status(500).send("Server Error");
  }
});

export default router;
