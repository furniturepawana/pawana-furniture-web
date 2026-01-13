import express from "express";
import FurnitureItem from "../models/FurnitureItem.js";
import FurnitureSet from "../models/FurnitureSet.js";
import Room from "../models/Room.js";
import SiteSettings from "../models/SiteSettings.js";
import { getOrSet } from "../utils/cache.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Fetch site settings directly (no cache)
    const settings = await SiteSettings.getSettings();

    // Get featured codes from settings
    const SIGNATURE_ITEMS_CODES = settings.home.featuredCodes.signatureItems;
    const FEATURED_ITEMS_CODES = settings.home.featuredCodes.featuredItems;
    const FEATURED_SETS_CODES = settings.home.featuredCodes.featuredSets;

    // Cache key based on featured codes (changes if admin updates codes)
    const homeDataKey = `home:data:${SIGNATURE_ITEMS_CODES.join(',')}_${FEATURED_ITEMS_CODES.join(',')}_${FEATURED_SETS_CODES.join(',')}`;

    // Fetch all home page data with caching (5 min TTL)
    const homeData = await getOrSet(homeDataKey, async () => {
      const [featuredItemsRaw, carouselItemsRaw, carouselSetsRaw, allItems, rooms] = await Promise.all([
        FurnitureItem.find({ code: { $in: SIGNATURE_ITEMS_CODES } }).lean(),
        FurnitureItem.find({ code: { $in: FEATURED_ITEMS_CODES } }).lean(),
        FurnitureSet.find({ code: { $in: FEATURED_SETS_CODES } }).lean(),
        FurnitureItem.find().sort({ createdAt: -1 }).lean(),
        Room.find().lean()
      ]);
      return { featuredItemsRaw, carouselItemsRaw, carouselSetsRaw, allItems, rooms };
    }, 300);

    const { featuredItemsRaw, carouselItemsRaw, carouselSetsRaw, allItems, rooms } = homeData;

    // Sort items to match code order
    const featuredItems = SIGNATURE_ITEMS_CODES.map(code =>
      featuredItemsRaw.find(item => item.code === code)
    ).filter(Boolean);

    const carouselItems = FEATURED_ITEMS_CODES.map(code =>
      carouselItemsRaw.find(item => item.code === code)
    ).filter(Boolean);

    const carouselSets = FEATURED_SETS_CODES.map(code =>
      carouselSetsRaw.find(set => set.code === code)
    ).filter(Boolean);

    // Group items by type
    const groupedItems = allItems.reduce((acc, item) => {
      const key = item.type.toLowerCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // Get browse by rooms codes from settings (convert Map to plain object if necessary)
    const browseByRoomCodesMap = settings.home.browseByRoomCodes;
    const browseByRoomCodes = browseByRoomCodesMap instanceof Map
      ? Object.fromEntries(browseByRoomCodesMap)
      : (browseByRoomCodesMap || {});

    // Collect all product codes needed for room images
    const productCodes = Object.values(browseByRoomCodes).filter(Boolean);

    // Fetch all products with these codes in one query (instead of N queries)
    const [productsWithCodes, setsWithCodes] = await Promise.all([
      FurnitureItem.find({ code: { $in: productCodes } }).select('code images').lean(),
      FurnitureSet.find({ code: { $in: productCodes } }).select('code images').lean()
    ]);

    // Create a map for quick lookup
    const productImageMap = {};
    [...productsWithCodes, ...setsWithCodes].forEach(p => {
      if (p.images && p.images.length > 0) {
        productImageMap[p.code] = p.images;
      }
    });

    // Map rooms with custom images
    const roomsWithCustomImages = rooms.map(room => {
      const productCode = browseByRoomCodes[room.name];
      if (productCode && productImageMap[productCode]) {
        return { ...room, images: productImageMap[productCode] };
      }
      return room;
    });

    // Get active hero image
    const heroImages = settings.home.hero.images || [];
    const activeHeroIndex = settings.home.hero.activeImageIndex || 0;
    const activeHeroImage = heroImages[activeHeroIndex]?.url || null;

    res.render("pages/home", {
      title: "Home",
      pageClass: "page-home",
      featuredItems,
      carouselItems,
      carouselSets,
      groupedItems,
      rooms: roomsWithCustomImages,
      heroContent: settings.home.hero,
      heroImageUrl: activeHeroImage,
      contactSettings: settings.contact,
      homeSettings: settings.home,
    });
  } catch (error) {
    console.error("Error loading home page:", error);
    res.status(500).send("Server Error");
  }
});


export default router;

