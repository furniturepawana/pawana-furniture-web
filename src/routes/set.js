import express from "express";
import FurnitureSet from "../models/FurnitureSet.js";
import SiteSettings from "../models/SiteSettings.js";
import { getOrSet } from "../utils/cache.js";

const router = express.Router();

// GET /set/:slug - Display furniture set with individual items
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Cache set data by slug (5 min TTL)
    const setData = await getOrSet(`set:${slug}`, async () => {
      const set = await FurnitureSet.findOne({ slug }).populate("items").lean();
      if (!set) return null;

      const [settings, similarSets, youMayAlsoLikeSetsRaw] = await Promise.all([
        SiteSettings.findOne().lean(),
        FurnitureSet.find({
          room: set.room,
          style: set.style,
          _id: { $ne: set._id },
        }).populate("items").limit(6).lean(),
        FurnitureSet.find({
          room: set.room,
          style: { $ne: set.style },
          _id: { $ne: set._id },
        }).populate("items").lean()
      ]);

      return { set, settings, similarSets, youMayAlsoLikeSetsRaw };
    }, 300);

    if (!setData || !setData.set) {
      return res.status(404).send("Set not found");
    }

    const { set, settings, similarSets: similarSetsRaw, youMayAlsoLikeSetsRaw } = setData;

    // Deduplicate similarSets (remove any duplicates based on _id)
    const seenSimilarIds = new Set();
    const similarSets = similarSetsRaw.filter(s => {
      const id = s._id.toString();
      if (seenSimilarIds.has(id)) return false;
      seenSimilarIds.add(id);
      return true;
    });

    // Build a set of IDs to exclude (current set + all similar sets)
    const excludeIds = new Set([
      set._id.toString(),
      ...similarSets.map(s => s._id.toString())
    ]);

    // Filter out any duplicates from youMayAlsoLike and randomize
    const youMayAlsoLikeSets = [...youMayAlsoLikeSetsRaw]
      .filter(s => !excludeIds.has(s._id.toString()))
      .sort(() => Math.random() - 0.5)
      .slice(0, 9);

    res.render("pages/set", {
      title: set.name,
      set,
      similarSets,
      youMayAlsoLikeSets,
      contactSettings: settings ? settings.contact : {},
    });
  } catch (error) {
    console.error("Error loading set page:", error);
    res.status(500).send("Server Error");
  }
});

export default router;
