import express from "express";
import FurnitureItem from "../models/FurnitureItem.js";
import FurnitureSet from "../models/FurnitureSet.js";

const router = express.Router();

// Stop words that indicate product type but shouldn't be searched as field values
const STOP_WORDS = ['set', 'sets', 'item', 'items', 'furniture', 'piece', 'pieces'];

// Known styles for detection
const KNOWN_STYLES = ['royal', 'modern', 'traditional'];

// Known rooms for detection (with variations)
const ROOM_MAPPINGS = {
  'living': 'Living Room',
  'livingroom': 'Living Room',
  'living room': 'Living Room',
  'dining': 'Dining Room',
  'diningroom': 'Dining Room',
  'dining room': 'Dining Room',
  'bedroom': 'Bedroom',
  'bed room': 'Bedroom',
  'office': 'Office',
  'showpiece': 'Showpieces',
  'showpieces': 'Showpieces'
};

// Parse query to extract hints and clean search terms
function parseQuery(query) {
  const trimmedQuery = query.trim().toLowerCase();
  const words = trimmedQuery.split(/\s+/).filter(word => word.length > 0);

  let preferSets = false;
  let preferItems = false;
  let detectedStyle = null;
  let detectedRoom = null;
  const searchWords = [];

  words.forEach(word => {
    // Check for set/item indicators
    if (word === 'set' || word === 'sets') {
      preferSets = true;
      return; // Don't add to search
    }
    if (word === 'item' || word === 'items') {
      preferItems = true;
      return; // Don't add to search
    }

    // Skip other stop words
    if (STOP_WORDS.includes(word)) {
      return;
    }

    // Check for style match
    if (KNOWN_STYLES.includes(word)) {
      detectedStyle = word.charAt(0).toUpperCase() + word.slice(1); // Capitalize
    }

    // Check for room match
    if (ROOM_MAPPINGS[word]) {
      detectedRoom = ROOM_MAPPINGS[word];
    }

    // Add to search words (including style/room as they're valid search terms)
    searchWords.push(word);
  });

  return {
    searchWords,
    preferSets,
    preferItems,
    detectedStyle,
    detectedRoom
  };
}

// Helper function to create search conditions for multi-word queries
function buildSearchQuery(words) {
  if (words.length === 0) {
    return null;
  }

  // If single word, use simple regex
  if (words.length === 1) {
    const searchRegex = new RegExp(words[0], "i");
    return {
      $or: [
        { name: searchRegex },
        { code: searchRegex },
        { style: searchRegex },
        { type: searchRegex },
        { room: searchRegex }
      ]
    };
  }

  // For multi-word queries, create conditions that match ANY word in ANY field
  const wordConditions = words.map(word => {
    const wordRegex = new RegExp(word, "i");
    return {
      $or: [
        { name: wordRegex },
        { code: wordRegex },
        { style: wordRegex },
        { type: wordRegex },
        { room: wordRegex }
      ]
    };
  });

  // Match items that contain ALL words (across any fields)
  return { $and: wordConditions };
}

// Helper function to build search query for sets (no 'type' field)
function buildSetSearchQuery(words) {
  if (words.length === 0) {
    return null;
  }

  if (words.length === 1) {
    const searchRegex = new RegExp(words[0], "i");
    return {
      $or: [
        { name: searchRegex },
        { code: searchRegex },
        { style: searchRegex },
        { room: searchRegex }
      ]
    };
  }

  const wordConditions = words.map(word => {
    const wordRegex = new RegExp(word, "i");
    return {
      $or: [
        { name: wordRegex },
        { code: wordRegex },
        { style: wordRegex },
        { room: wordRegex }
      ]
    };
  });

  return { $and: wordConditions };
}

// Helper to score results by relevance
function scoreResult(item, words) {
  let score = 0;
  const itemName = (item.name || "").toLowerCase();
  const itemCode = (item.code || "").toLowerCase();
  const itemStyle = (item.style || "").toLowerCase();
  const itemType = (item.type || "").toLowerCase();
  const itemRoom = (item.room || "").toLowerCase();

  words.forEach(word => {
    const lowerWord = word.toLowerCase();
    // Name matches are most valuable
    if (itemName.includes(lowerWord)) score += 10;
    // Exact style match
    if (itemStyle === lowerWord) score += 8;
    if (itemStyle.includes(lowerWord)) score += 5;
    // Exact type match
    if (itemType === lowerWord) score += 8;
    if (itemType.includes(lowerWord)) score += 5;
    // Code match
    if (itemCode.includes(lowerWord)) score += 3;
    // Room match
    if (itemRoom.includes(lowerWord)) score += 2;
  });

  return score;
}

// Detect the most common type from items results
function detectType(items) {
  if (items.length === 0) return null;

  const typeCounts = {};
  items.forEach(item => {
    if (item.type) {
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    }
  });

  // Return most common type if it appears in more than half the results
  const entries = Object.entries(typeCounts);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  const [topType, count] = entries[0];

  if (count >= items.length * 0.5) {
    return topType;
  }
  return null;
}

// GET /api/search?q=<query> - Search items and sets
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ items: [], sets: [], filters: {} });
    }

    // Parse query to extract hints and clean search terms
    const { searchWords, preferSets, preferItems, detectedStyle, detectedRoom } = parseQuery(q);

    // If no search words left after removing stop words, return empty
    if (searchWords.length === 0) {
      return res.json({ items: [], sets: [], filters: { preferSets, preferItems } });
    }

    // Build queries
    const itemQuery = buildSearchQuery(searchWords);
    const setQuery = buildSetSearchQuery(searchWords);

    // Search items
    let items = await FurnitureItem.find(itemQuery)
      .limit(30)
      .select("name slug code style type room images")
      .lean();

    // Search sets
    let sets = await FurnitureSet.find(setQuery)
      .limit(30)
      .select("name slug code style room images")
      .lean();

    // Score and sort results by relevance
    items = items.map(item => ({
      ...item,
      _score: scoreResult(item, searchWords)
    })).sort((a, b) => b._score - a._score).slice(0, 20);

    sets = sets.map(set => ({
      ...set,
      _score: scoreResult(set, searchWords)
    })).sort((a, b) => b._score - a._score).slice(0, 20);

    // Detect type from top items if not all same style/room
    const detectedType = detectType(items);

    // Remove score from response
    items = items.map(({ _score, ...item }) => item);
    sets = sets.map(({ _score, ...set }) => set);

    // Build filters object for frontend
    const filters = {
      detectedStyle,
      detectedRoom,
      detectedType,
      preferSets,
      preferItems
    };

    res.json({ items, sets, filters });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;

