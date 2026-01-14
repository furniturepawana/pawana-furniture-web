import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdminAuth, isAdminLoggedIn, validateAdminLogin, setAdminCookie, clearAdminCookie } from '../middleware/adminAuth.js';
import FurnitureSet from '../models/FurnitureSet.js';
import FurnitureItem from '../models/FurnitureItem.js';
import Room from '../models/Room.js';
import SiteSettings from '../models/SiteSettings.js';
import { invalidate } from '../utils/cache.js';

const router = express.Router();

// ==========================================
// UPLOAD CONFIGURATION
// Centralized settings for file size limits and aspect ratios
// Modify these values to adjust upload constraints
// ==========================================

const UPLOAD_CONFIG = {
  // File size limits (in MB)
  fileSizeLimits: {
    default: 1,           // Default limit for all uploads
    sets: 3,              // Furniture sets
    items: 3,             // Individual furniture items
    heroImage: 5,         // Home page hero images (largest for quality)
    aboutStory: 3,        // About page "Our Story" image
    aboutProcess: 1,      // About page process step images
    services: 1,          // Services page images
    rooms: 1              // Room featured images
  },

  // Enforced aspect ratios (width:height)
  // Only specify for sections that REQUIRE specific ratios
  // Omit sections that allow any aspect ratio
  aspectRatios: {
    sets: '4:3',          // Square for product cards
    items: '1:1',         // Square for product cards
    heroImage: '16:9'     // Widescreen for hero banner
    // aboutStory, aboutProcess, services, rooms - no enforcement
  },

  // Max image dimensions (width in pixels, used by Cloudinary)
  maxWidth: {
    default: 1200,
    heroImage: 1920,      // Full-width hero needs more resolution
    sets: 1200,
    items: 1200,
    aboutStory: 1200,
    aboutProcess: 1200,
    services: 1200,
    rooms: 1200
  },

  // Allowed file types
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

// Helper to get file size limit in bytes
function getFileSizeLimit(section = 'default') {
  const limitMB = UPLOAD_CONFIG.fileSizeLimits[section] || UPLOAD_CONFIG.fileSizeLimits.default;
  return limitMB * 1024 * 1024;
}

// Helper to get max width for a section
function getMaxWidth(section = 'default') {
  return UPLOAD_CONFIG.maxWidth[section] || UPLOAD_CONFIG.maxWidth.default;
}

// Helper to clear relevant caches when data changes
async function clearProductCaches() {
  await Promise.all([
    invalidate('home:*'),
    invalidate('catalogue:*'),
    invalidate('item:*'),
    invalidate('set:*'),
    invalidate('room:*'),
    invalidate('nav:*'),
    invalidate('settings')
  ]);
}

// Configure multer for memory storage (for Cloudinary uploads)
// Uses the largest limit from config; section-specific validation can be added per route
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getFileSizeLimit('heroImage') }, // Use largest limit as base; routes can validate further
  fileFilter: (req, file, cb) => {
    if (UPLOAD_CONFIG.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP allowed.'));
    }
  }
});

// Lazy Cloudinary configuration (env vars loaded after import)
let cloudinaryConfigured = false;
// Cloudinary is auto-configured via CLOUDINARY_URL environment variable
// No manual config needed - the library reads it automatically
function ensureCloudinaryConfig() {
    cloudinaryConfigured = true;
  }

// Centralized Cloudinary upload helper with optimized transformations
// Ensures all uploads are webp, optimized quality, and reasonable file sizes (~500KB max)
async function uploadToCloudinary(fileBuffer, options = {}) {
  ensureCloudinaryConfig();

  const {
    folder = 'pawana/uploads',
    publicId = `upload_${Date.now().toString(36)}`,
    isHeroImage = false,      // Hero images can be larger (up to 1920px)
    maxWidth = 1200,          // Default max width for product/content images
    aspectRatio = null        // Optional aspect ratio to enforce (e.g. '16:9')
  } = options;

  // Determine optimal width based on image type
  const targetWidth = isHeroImage ? 1920 : maxWidth;

  // Base transformation
  let mainTransform = {
    width: targetWidth,
    quality: 'auto:good',
    fetch_format: 'webp'
  };

  // Apply aspect ratio cropping if specified, otherwise just limit width
  if (aspectRatio) {
    mainTransform.aspect_ratio = aspectRatio;
    mainTransform.crop = 'fill';
    mainTransform.gravity = 'auto'; // Focus on interesting part of image
  } else {
    mainTransform.crop = 'limit';
  }

  // Consistent transformation settings for all uploads:
  // - webp format for best compression
  // - quality limit to keep file sizes small
  // - max width to prevent oversized uploads
  const uploadOptions = {
    folder,
    public_id: publicId,
    resource_type: 'image',
    format: 'webp',
    transformation: [
      mainTransform,
      {
        quality: 80,                // Cap quality at 80 for consistent file sizes
        flags: 'lossy'              // Allow lossy compression for smaller files
      }
    ]
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          // Log specific Cloudinary errors for debugging
          if (error.http_code === 401) {
            console.error('❌ Cloudinary: Authentication failed - check CLOUDINARY_URL');
          } else if (error.http_code === 420) {
            console.error('❌ Cloudinary: Rate limited - too many requests');
          } else if (error.http_code === 400) {
            console.error('❌ Cloudinary: Bad request -', error.message);
          } else if (error.http_code === 500) {
            console.error('❌ Cloudinary: Server error - service may be down');
          } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ETIMEDOUT')) {
            console.error('❌ Cloudinary: Network error - cannot reach service');
          } else {
            console.error('❌ Cloudinary upload failed:', error.message || error);
          }
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    stream.end(fileBuffer);
  });
}

// Room and Style mappings for code generation
const ROOM_INITIALS = {
  'Living Room': 'L',
  'Dining Room': 'D',
  'Bedroom': 'B',
  'Office': 'O',
  'Showpieces': 'S'
};

const STYLE_INITIALS = {
  'Royal': 'R',
  'Traditional': 'T',
  'Modern': 'M'
};

// ==========================================
// LOGIN ROUTES
// ==========================================

// DEBUG: Check if env vars are set (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug', (req, res) => {
    res.json({
      adminIdSet: !!process.env.ADMIN_ID,
      passwordSet: !!process.env.ADMIN_PASSWORD,
      adminRoute: process.env.ADMIN_ROUTE || 'NOT SET',
      nodeEnv: process.env.NODE_ENV || 'NOT SET'
    });
  });
}

// GET /admin-route - Login page or redirect to dashboard
router.get('/', (req, res) => {
  if (isAdminLoggedIn(req)) {
    return res.redirect(`/${process.env.ADMIN_ROUTE}/dashboard`);
  }
  res.render('admin/login', {
    layout: false,
    error: null,
    adminRoute: process.env.ADMIN_ROUTE
  });
});

// POST /admin-route/login - Handle login
router.post('/login', (req, res) => {
  const { adminId, password } = req.body;

  const token = validateAdminLogin(adminId, password);
  if (token) {
    setAdminCookie(res, token);
    res.redirect(`/${process.env.ADMIN_ROUTE}/dashboard`);
  } else {
    console.log('Admin login failed for ID:', adminId ? adminId.substring(0, 2) + '***' : 'empty');
    res.render('admin/login', {
      layout: false,
      error: 'Invalid credentials. Please try again.',
      adminRoute: process.env.ADMIN_ROUTE
    });
  }
});


// GET /admin-route/dashboard - Main dashboard
router.get('/dashboard', requireAdminAuth, async (req, res) => {
  try {
    const allRooms = await Room.find();

    // Custom room order for admin panel
    const roomOrder = ['Living Room', 'Bedroom', 'Dining Room', 'Office', 'Showpieces'];
    const rooms = allRooms.sort((a, b) => {
      const indexA = roomOrder.indexOf(a.name);
      const indexB = roomOrder.indexOf(b.name);
      // Put unknown rooms at the end
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    // Get tab from query param for direct tab navigation
    const activeTab = req.query.tab || 'sets';

    res.render('admin/dashboard', {
      layout: false,
      rooms,
      adminRoute: process.env.ADMIN_ROUTE,
      activeTab
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Server Error');
  }
});

// POST /admin-route/logout
router.post('/logout', (req, res) => {
  clearAdminCookie(res);
  res.redirect(`/${process.env.ADMIN_ROUTE}`);
});

// ==========================================
// API ROUTES - SETS
// ==========================================

// GET sets with filters
router.get('/api/sets', requireAdminAuth, async (req, res) => {
  try {
    const { room, style } = req.query;
    const query = {};
    if (room) query.room = room;
    if (style) query.style = style;

    const sets = await FurnitureSet.find(query).sort({ code: 1 });
    res.json(sets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET next available code for sets
router.get('/api/sets/next-code', requireAdminAuth, async (req, res) => {
  try {
    const { room, style } = req.query;
    if (!room || !style) {
      return res.status(400).json({ error: 'Room and style are required' });
    }
    const nextCode = await getNextSetCode(room, style);
    // Return just the number part
    const numberPart = nextCode.split('-')[1];
    res.json({ code: nextCode, number: numberPart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate next available code for sets
async function getNextSetCode(room, style) {
  const prefix = ROOM_INITIALS[room] + STYLE_INITIALS[style];
  const existingSets = await FurnitureSet.find({
    code: new RegExp(`^${prefix}-\\d{2}$`)
  }).sort({ code: -1 });

  if (existingSets.length === 0) {
    return `${prefix}-01`;
  }

  // Find the highest number and increment
  const lastCode = existingSets[0].code;
  const lastNum = parseInt(lastCode.split('-')[1]);
  const nextNum = (lastNum + 1).toString().padStart(2, '0');
  return `${prefix}-${nextNum}`;
}

// POST create new set (with optional image upload and custom code)
router.post('/api/sets', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const { room, style, name, description, customCode } = req.body;

    // Validate required fields
    if (!room || !style || !name) {
      return res.status(400).json({ error: 'Room, style, and name are required' });
    }

    let code;

    // Use custom code if provided, otherwise auto-generate
    if (customCode) {
      // Validate format (XX-NN)
      const expectedPrefix = ROOM_INITIALS[room] + STYLE_INITIALS[style] + '-';
      if (!customCode.startsWith(expectedPrefix) || !/^\d{2}$/.test(customCode.slice(-2))) {
        return res.status(400).json({ error: `Code must match format ${expectedPrefix}NN` });
      }

      // Check for conflict
      const existing = await FurnitureSet.findOne({ code: customCode });
      if (existing) {
        return res.status(400).json({ error: `Code ${customCode} already exists` });
      }

      code = customCode;
    } else {
      code = await getNextSetCode(room, style);
    }

    // Prepare images array
    let images = [];

    // Upload image if provided
    if (req.file) {
      const roomSlug = room.toLowerCase().replace(' ', '-');
      const styleSlug = style.toLowerCase();
      const folder = `pawana/${roomSlug}/${styleSlug}/sets`;
      const shortHash = Date.now().toString(36).slice(-4);
      const uniqueId = `${code}_${shortHash}`;

      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder,
        publicId: uniqueId
      });

      images.push({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      });
    }

    const newSet = new FurnitureSet({
      room,
      style,
      name,
      code,
      description: description || '',
      images
    });

    await newSet.save();
    await clearProductCaches();
    res.json(newSet);
  } catch (error) {
    console.error('Create set error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update set
router.put('/api/sets/:id', requireAdminAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const set = await FurnitureSet.findById(req.params.id);

    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    if (name) set.name = name;
    if (description !== undefined) set.description = description;

    await set.save();
    await clearProductCaches();
    res.json(set);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE set
router.delete('/api/sets/:id', requireAdminAuth, async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const set = await FurnitureSet.findById(req.params.id);

    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Delete images from Cloudinary
    for (const img of set.images) {
      if (img.publicId) {
        await cloudinary.uploader.destroy(img.publicId);
      }
    }

    await FurnitureSet.findByIdAndDelete(req.params.id);
    await clearProductCaches();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API ROUTES - ITEMS
// ==========================================

// GET items with filters
router.get('/api/items', requireAdminAuth, async (req, res) => {
  try {
    const { room, style, type } = req.query;
    const query = {};
    if (room) query.room = room;
    if (style) query.style = style;
    if (type) query.type = type;

    const items = await FurnitureItem.find(query).sort({ code: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get distinct furniture types
router.get('/api/furniture-types', requireAdminAuth, async (req, res) => {
  try {
    const { room, style } = req.query;
    const query = {};
    if (room) query.room = room;
    if (style) query.style = style;

    const types = await FurnitureItem.distinct('type', query);
    res.json(types.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET next available code for items
router.get('/api/items/next-code', requireAdminAuth, async (req, res) => {
  try {
    const { room, style } = req.query;
    if (!room || !style) {
      return res.status(400).json({ error: 'Room and style are required' });
    }
    const nextCode = await getNextItemCode(room, style);
    // Return just the number part
    const numberPart = nextCode.split('-')[1];
    res.json({ code: nextCode, number: numberPart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate next available code for items
async function getNextItemCode(room, style) {
  const prefix = ROOM_INITIALS[room] + STYLE_INITIALS[style];
  const existingItems = await FurnitureItem.find({
    code: new RegExp(`^${prefix}-\\d{3}$`)
  }).sort({ code: -1 });

  if (existingItems.length === 0) {
    return `${prefix}-001`;
  }

  const lastCode = existingItems[0].code;
  const lastNum = parseInt(lastCode.split('-')[1]);
  const nextNum = (lastNum + 1).toString().padStart(3, '0');
  return `${prefix}-${nextNum}`;
}

// POST create new item (with optional image upload and custom code)
router.post('/api/items', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const { room, style, name, type, description, price, customCode } = req.body;

    console.log('[DEBUG POST ITEM] ============================');
    console.log('[DEBUG POST ITEM] Room:', room);
    console.log('[DEBUG POST ITEM] Type:', type);
    console.log('[DEBUG POST ITEM] Room === "Showpieces":', room === 'Showpieces');

    if (!room || !style || !name || !type) {
      return res.status(400).json({ error: 'Room, style, name, and type are required' });
    }

    let code;

    // Use custom code if provided, otherwise auto-generate
    if (customCode) {
      // Validate format (XX-NNN)
      const expectedPrefix = ROOM_INITIALS[room] + STYLE_INITIALS[style] + '-';
      if (!customCode.startsWith(expectedPrefix) || !/^\d{3}$/.test(customCode.slice(-3))) {
        return res.status(400).json({ error: `Code must match format ${expectedPrefix}NNN` });
      }

      // Check for conflict
      const existing = await FurnitureItem.findOne({ code: customCode });
      if (existing) {
        return res.status(400).json({ error: `Code ${customCode} already exists` });
      }

      code = customCode;
    } else {
      code = await getNextItemCode(room, style);
    }

    // Prepare images array
    let images = [];

    // Upload image if provided
    if (req.file) {
      const roomSlug = room.toLowerCase().replace(' ', '-');
      const styleSlug = style.toLowerCase();
      const folder = `pawana/${roomSlug}/${styleSlug}/items`;
      const shortHash = Date.now().toString(36).slice(-4);
      const uniqueId = `${code}_${shortHash}`;

      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder,
        publicId: uniqueId
      });

      images.push({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      });
    }

    const newItem = new FurnitureItem({
      room,
      style,
      name,
      type,
      code,
      description: description || '',
      price: price || null,
      images
    });

    await newItem.save();

    // For Showpieces: auto-assign this item's code as featured image for new furniture types
    if (room === 'Showpieces') {
      console.log('[DEBUG ITEM CREATE] Room is Showpieces, checking type codes...');
      console.log('[DEBUG ITEM CREATE] Type:', type, 'Code:', code);

      const settings = await SiteSettings.getSettings();
      // Convert Map to plain object if necessary
      const typeCodesMap = settings.home?.showpiecesTypeCodes;
      const typeCodes = typeCodesMap instanceof Map
        ? Object.fromEntries(typeCodesMap)
        : (typeCodesMap || {});
      console.log('[DEBUG ITEM CREATE] Existing typeCodes:', typeCodes);

      // If this type doesn't have a code assigned yet, assign this item's code
      if (!typeCodes[type]) {
        console.log('[DEBUG ITEM CREATE] Type not found, assigning code:', code);
        typeCodes[type] = code;

        const updateResult = await SiteSettings.updateSettings({
          'home.showpiecesTypeCodes': typeCodes
        });
        console.log('[DEBUG ITEM CREATE] After update, typeCodes:', updateResult?.home?.showpiecesTypeCodes);
      } else {
        console.log('[DEBUG ITEM CREATE] Type already has code:', typeCodes[type]);
      }
    }

    await clearProductCaches();
    res.json(newItem);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update item
router.put('/api/items/:id', requireAdminAuth, async (req, res) => {
  try {
    const { name, description, price, type } = req.body;
    const item = await FurnitureItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (name) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    if (type) item.type = type;

    await item.save();
    await clearProductCaches();
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE item
router.delete('/api/items/:id', requireAdminAuth, async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const item = await FurnitureItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Delete images from Cloudinary
    for (const img of item.images) {
      if (img.publicId) {
        await cloudinary.uploader.destroy(img.publicId);
      }
    }

    await FurnitureItem.findByIdAndDelete(req.params.id);
    await clearProductCaches();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API ROUTES - ROOMS
// ==========================================

// GET all rooms (with featured codes from SiteSettings)
router.get('/api/rooms', requireAdminAuth, async (req, res) => {
  try {
    const [rooms, settings] = await Promise.all([
      Room.find().sort({ name: 1 }).lean(),
      SiteSettings.getSettings()
    ]);

    // Convert Map to plain object if necessary
    const browseByRoomCodesMap = settings.home?.browseByRoomCodes;
    const browseByRoomCodes = browseByRoomCodesMap instanceof Map
      ? Object.fromEntries(browseByRoomCodesMap)
      : (browseByRoomCodesMap || {});

    // Attach featuredCode from SiteSettings to each room
    const roomsWithCodes = rooms.map(room => ({
      ...room,
      featuredCode: browseByRoomCodes[room.name] || ''
    }));

    res.json(roomsWithCodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update room (no delete allowed)
router.put('/api/rooms/:id', requireAdminAuth, async (req, res) => {
  try {
    console.log('[DEBUG PUT ROOM] ============================');
    console.log('[DEBUG PUT ROOM] Request body:', JSON.stringify(req.body, null, 2));

    const { description, hasIndividualItems, featuredCode, showpiecesTypeCodes } = req.body;
    console.log('[DEBUG PUT ROOM] showpiecesTypeCodes value:', showpiecesTypeCodes);
    console.log('[DEBUG PUT ROOM] showpiecesTypeCodes is truthy:', !!showpiecesTypeCodes);

    const room = await Room.findById(req.params.id);
    console.log('[DEBUG PUT ROOM] Room name:', room?.name);
    console.log('[DEBUG PUT ROOM] Is Showpieces:', room?.name === 'Showpieces');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (description !== undefined) room.description = description;
    if (hasIndividualItems !== undefined) room.hasIndividualItems = hasIndividualItems;

    await room.save();

    // Update featuredCode in SiteSettings browseByRoomCodes
    if (featuredCode !== undefined) {
      const settings = await SiteSettings.getSettings();
      // Convert Map to plain object if necessary
      const browseByRoomCodesMap = settings.home?.browseByRoomCodes;
      const browseByRoomCodes = browseByRoomCodesMap instanceof Map
        ? Object.fromEntries(browseByRoomCodesMap)
        : (browseByRoomCodesMap || {});
      browseByRoomCodes[room.name] = featuredCode;
      await SiteSettings.updateSettings({
        'home.browseByRoomCodes': browseByRoomCodes
      });
    }

    // For Showpieces room, also update the showpiecesTypeCodes in SiteSettings
    if (room.name === 'Showpieces' && showpiecesTypeCodes) {
      console.log('[DEBUG] Updating showpiecesTypeCodes:');
      console.log('[DEBUG] Received from frontend:', showpiecesTypeCodes);

      // Merge with existing type codes to preserve any codes not included in update
      const settings = await SiteSettings.getSettings();
      // Convert Map to plain object if necessary
      const existingTypeCodesMap = settings.home?.showpiecesTypeCodes;
      const existingTypeCodes = existingTypeCodesMap instanceof Map
        ? Object.fromEntries(existingTypeCodesMap)
        : (existingTypeCodesMap || {});
      console.log('[DEBUG] Existing in DB (converted):', existingTypeCodes);

      const mergedTypeCodes = { ...existingTypeCodes, ...showpiecesTypeCodes };
      console.log('[DEBUG] Merged result:', mergedTypeCodes);

      const updateResult = await SiteSettings.updateSettings({
        'home.showpiecesTypeCodes': mergedTypeCodes
      });
      console.log('[DEBUG] After save, showpiecesTypeCodes:', updateResult?.home?.showpiecesTypeCodes);
    }

    await clearProductCaches();

    // Return room with updated featuredCode
    const updatedRoom = room.toObject();
    updatedRoom.featuredCode = featuredCode;
    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET validate a code for a room (checks if code exists and matches room)
router.get('/api/validate-code', requireAdminAuth, async (req, res) => {
  try {
    const { code, room: roomName } = req.query;

    if (!code) {
      return res.status(400).json({ valid: false, error: 'Code is required' });
    }

    // For Showpieces, only items exist (no sets)
    if (roomName === 'Showpieces') {
      const item = await FurnitureItem.findOne({ code, room: 'Showpieces' });
      if (item) {
        return res.json({
          valid: true,
          type: 'item',
          name: item.name,
          image: item.images?.[0]?.url || null
        });
      }
      return res.json({ valid: false, error: 'Item not found in Showpieces' });
    }

    // For other rooms, check both sets and items
    const [set, item] = await Promise.all([
      FurnitureSet.findOne({ code, room: roomName }),
      FurnitureItem.findOne({ code, room: roomName })
    ]);

    if (set) {
      return res.json({
        valid: true,
        type: 'set',
        name: set.name,
        image: set.images?.[0]?.url || null
      });
    }

    if (item) {
      return res.json({
        valid: true,
        type: 'item',
        name: item.name,
        image: item.images?.[0]?.url || null
      });
    }

    return res.json({ valid: false, error: `Code not found in ${roomName}` });
  } catch (error) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

// GET furniture types for a room (for Showpieces type codes management)
router.get('/api/room-types/:roomName', requireAdminAuth, async (req, res) => {
  try {
    const { roomName } = req.params;
    const types = await FurnitureItem.distinct('type', { room: roomName });

    // For Showpieces, also get the current type codes from settings
    if (roomName === 'Showpieces') {
      const settings = await SiteSettings.getSettings();
      // Convert Map to plain object if necessary
      const typeCodesMap = settings.home?.showpiecesTypeCodes;
      const typeCodes = typeCodesMap instanceof Map
        ? Object.fromEntries(typeCodesMap)
        : (typeCodesMap || {});

      // Return types with their current codes
      const result = types.sort().map(type => ({
        type,
        code: typeCodes[type] || ''
      }));

      return res.json(result);
    }

    res.json(types.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// API ROUTES - IMAGE UPLOAD
// ==========================================

// POST upload image
router.post('/api/upload-image', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const { collection, documentId, imageIndex } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get the document
    let Model, doc;
    switch (collection) {
      case 'FurnitureSet':
        Model = FurnitureSet;
        break;
      case 'FurnitureItem':
        Model = FurnitureItem;
        break;
      case 'Room':
        Model = Room;
        break;
      default:
        return res.status(400).json({ error: 'Invalid collection' });
    }

    doc = await Model.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Determine Cloudinary folder
    let folder;
    if (collection === 'Room') {
      folder = 'pawana/rooms';
    } else {
      const roomSlug = doc.room.toLowerCase().replace(' ', '-');
      const styleSlug = doc.style.toLowerCase();
      folder = collection === 'FurnitureSet'
        ? `pawana/${roomSlug}/${styleSlug}/sets`
        : `pawana/${roomSlug}/${styleSlug}/items`;
    }

    // Delete old image from database record if exists
    const baseId = doc.code || doc.slug;

    // Use a short suffix for unique naming (avoids CDN cache issues)
    // Result: LR-01_a1b2.webp (readable but unique)
    const shortHash = Date.now().toString(36).slice(-4);
    const uniqueId = `${baseId}_${shortHash}`;

    // Upload to Cloudinary with optimized settings
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder,
      publicId: uniqueId
    });

    const newImageData = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };

    console.log('Upload successful:', newImageData);
    console.log('Current images count:', doc.images.length);
    console.log('Image index:', imageIndex, 'parsed:', parseInt(imageIndex));

    // Update document
    const idx = parseInt(imageIndex);
    if (idx === -1 || doc.images.length === 0) {
      // Add new image
      doc.images.push(newImageData);
      console.log('Pushed new image. New count:', doc.images.length);
    } else if (idx >= 0 && idx < doc.images.length) {
      // Replace existing image
      if (doc.images[idx].publicId) {
        await cloudinary.uploader.destroy(doc.images[idx].publicId);
      }
      doc.images[idx] = newImageData;
      console.log('Replaced image at index:', idx);
    } else {
      // Index out of bounds, add as new
      doc.images.push(newImageData);
      console.log('Index out of bounds, pushed new image');
    }

    // Mark images array as modified (important for Mongoose subdocs)
    doc.markModified('images');

    await doc.save();
    console.log('Document saved. Final images:', doc.images);

    res.json({ success: true, image: newImageData, totalImages: doc.images.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API ROUTES - SITE SETTINGS
// ==========================================

// GET upload configuration (for client-side validation)
router.get('/api/upload-config', requireAdminAuth, (req, res) => {
  res.json(UPLOAD_CONFIG);
});

// GET all settings
router.get('/api/settings', requireAdminAuth, async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update home settings
router.put('/api/settings/home', requireAdminAuth, async (req, res) => {
  try {
    const {
      tagline, badges, stats, signatureItems, featuredItems, featuredSets,
      deliveryTitle, deliveryParagraphs, indiaLocations, internationalLocations,
      footer, sections
    } = req.body;

    // Get current settings to preserve existing flag images
    const currentSettings = await SiteSettings.getSettings();
    const existingIntlLocations = currentSettings.home?.delivery?.internationalLocations || [];

    // Merge international locations - preserve flag images for existing entries unless new one provided
    const mergedIntlLocations = (internationalLocations || []).map((loc, index) => {
      const existing = existingIntlLocations[index];
      // Use incoming flag if provided (has url), otherwise fallback to existing
      const flagImage = (loc.flagImage && loc.flagImage.url)
        ? loc.flagImage
        : (existing?.flagImage || { url: '', publicId: '' });

      return {
        name: loc.name,
        flagImage
      };
    });

    const updates = {
      'home.hero.tagline': tagline,
      'home.hero.badges': badges,
      'home.hero.stats': stats,
      'home.featuredCodes.signatureItems': signatureItems,
      'home.featuredCodes.featuredItems': featuredItems,
      'home.featuredCodes.featuredSets': featuredSets,
      // Delivery section
      'home.delivery.title': deliveryTitle,
      'home.delivery.paragraphs': deliveryParagraphs,
      'home.delivery.indiaLocations': indiaLocations,
      'home.delivery.internationalLocations': mergedIntlLocations,
      // Footer section
      'home.footer': footer,
      // Section Text Configuration
      'home.sections': sections
    };

    const settings = await SiteSettings.updateSettings(updates);
    await clearProductCaches();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST upload hero image (up to 3, webp format, under 1MB)
router.post('/api/settings/home/hero-image', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const { slotIndex } = req.body;
    const idx = parseInt(slotIndex);

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (idx < 0 || idx > 2) {
      return res.status(400).json({ error: 'Invalid slot index (must be 0, 1, or 2)' });
    }

    const settings = await SiteSettings.getSettings();
    const currentImages = settings.home?.hero?.images || [];

    // Get old image publicId if replacing
    let oldPublicId = null;
    if (currentImages[idx]?.publicId) {
      oldPublicId = currentImages[idx].publicId;
    }

    // Upload to Cloudinary with optimized settings (hero images allow larger width)
    const folder = 'pawana/hero';
    const shortHash = Date.now().toString(36).slice(-4);
    const uniqueId = `hero-${idx}_${shortHash}`;

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder,
      publicId: uniqueId,
      isHeroImage: true,
      aspectRatio: UPLOAD_CONFIG.aspectRatios.heroImage,
      fileSizeLimit: UPLOAD_CONFIG.fileSizeLimits.heroImage
    });

    // Delete old image if exists
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (e) {
        console.log('Could not delete old hero image:', e.message);
      }
    }

    // Update the specific slot in the images array
    const newImages = [...currentImages];
    while (newImages.length <= idx) {
      newImages.push({ url: '', publicId: '' });
    }
    newImages[idx] = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };

    await SiteSettings.updateSettings({
      'home.hero.images': newImages
    });
    await clearProductCaches();

    res.json({
      success: true,
      image: newImages[idx],
      slotIndex: idx
    });
  } catch (error) {
    console.error('Hero image upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT set active hero image index
router.put('/api/settings/home/hero-active', requireAdminAuth, async (req, res) => {
  try {
    const { activeIndex } = req.body;
    const idx = parseInt(activeIndex);

    if (idx < 0 || idx > 2) {
      return res.status(400).json({ error: 'Invalid active index' });
    }

    await SiteSettings.updateSettings({
      'home.hero.activeImageIndex': idx
    });
    await clearProductCaches();

    res.json({ success: true, activeIndex: idx });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE hero image from slot
router.delete('/api/settings/home/hero-image/:slotIndex', requireAdminAuth, async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const idx = parseInt(req.params.slotIndex);

    if (idx < 0 || idx > 2) {
      return res.status(400).json({ error: 'Invalid slot index' });
    }

    const settings = await SiteSettings.getSettings();
    const currentImages = settings.home?.hero?.images || [];

    // Delete from Cloudinary if exists
    if (currentImages[idx]?.publicId) {
      try {
        await cloudinary.uploader.destroy(currentImages[idx].publicId);
      } catch (e) {
        console.log('Could not delete hero image from Cloudinary:', e.message);
      }
    }

    // Clear the slot
    const newImages = [...currentImages];
    if (newImages[idx]) {
      newImages[idx] = { url: '', publicId: '' };
    }

    // If deleting the active image, reset to first available
    let activeIndex = settings.home?.hero?.activeImageIndex || 0;
    if (activeIndex === idx) {
      // Find first non-empty slot
      const firstAvailable = newImages.findIndex(img => img && img.url);
      activeIndex = firstAvailable >= 0 ? firstAvailable : 0;
    }

    await SiteSettings.updateSettings({
      'home.hero.images': newImages,
      'home.hero.activeImageIndex': activeIndex
    });
    await clearProductCaches();

    res.json({ success: true, activeIndex });
  } catch (error) {
    console.error('Hero image delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload delivery map image
router.post('/api/settings/home/delivery-map', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const settings = await SiteSettings.getSettings();
    const oldPublicId = settings.home?.delivery?.mapImage?.publicId;

    // Upload to Cloudinary
    const folder = 'pawana/delivery';
    const shortHash = Date.now().toString(36).slice(-4);
    const uniqueId = `delivery-map_${shortHash}`;

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder,
      publicId: uniqueId
    });

    // Delete old image if exists
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (e) {
        console.log('Could not delete old delivery map:', e.message);
      }
    }

    await SiteSettings.updateSettings({
      'home.delivery.mapImage': {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      }
    });
    await clearProductCaches();

    res.json({
      success: true,
      image: { url: uploadResult.secure_url, publicId: uploadResult.public_id }
    });
  } catch (error) {
    console.error('Delivery map upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload international flag
router.post('/api/settings/home/international-flag', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload to Cloudinary
    const folder = 'pawana/flags';
    const shortHash = Date.now().toString(36).slice(-4);
    const uniqueId = `flag_${shortHash}`;

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder,
      publicId: uniqueId
    });

    // Just return the url, don't update settings directly
    res.json({
      success: true,
      image: { url: uploadResult.secure_url, publicId: uploadResult.public_id }
    });

  } catch (error) {
    console.error('Flag upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update contact settings
router.put('/api/settings/contact', requireAdminAuth, async (req, res) => {
  try {
    const {
      pageTitle, pageDescription, faq,
      phone1, phone2, whatsappEnquiry, email, formEmail,
      addressLine1, addressLine2, addressLine3, addressCountry,
      hoursWeekday, hoursWeekend, socialMedia, formSection
    } = req.body;

    const updates = {
      'contact.pageTitle': pageTitle,
      'contact.pageDescription': pageDescription,
      'contact.faq': faq,
      'contact.phone1': phone1,
      'contact.phone2': phone2,
      'contact.whatsappEnquiry': whatsappEnquiry,
      'contact.email': email,
      'contact.formEmail': formEmail,
      'contact.address.line1': addressLine1,
      'contact.address.line2': addressLine2,
      'contact.address.line3': addressLine3,
      'contact.address.country': addressCountry,
      'contact.businessHours.weekday': hoursWeekday,
      'contact.businessHours.weekend': hoursWeekend,
      'contact.socialMedia': socialMedia,
      'contact.formSection': formSection
    };

    const settings = await SiteSettings.updateSettings(updates);
    await clearProductCaches();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update about settings
router.put('/api/settings/about', requireAdminAuth, async (req, res) => {
  try {
    const { pageTitle, pageDescription, story, values, process, heritage, cta } = req.body;

    const updates = {};

    if (pageTitle !== undefined) updates['about.pageTitle'] = pageTitle;
    if (pageDescription !== undefined) updates['about.pageDescription'] = pageDescription;

    // Story text fields (not image - that's handled by image upload route)
    if (story) {
      if (story.title !== undefined) updates['about.story.title'] = story.title;
      if (story.subtitle !== undefined) updates['about.story.subtitle'] = story.subtitle;
      if (story.content !== undefined) updates['about.story.content'] = story.content;
    }

    // Values array
    if (values !== undefined) {
      updates['about.values'] = values;
    }

    // Process intro and steps (not images)
    if (process) {
      if (process.intro !== undefined) updates['about.process.intro'] = process.intro;
      if (process.steps !== undefined) updates['about.process.steps'] = process.steps;
    }

    // Heritage section
    if (heritage) {
      if (heritage.title !== undefined) updates['about.heritage.title'] = heritage.title;
      if (heritage.description !== undefined) updates['about.heritage.description'] = heritage.description;
    }

    // CTA section
    if (cta) {
      if (cta.title !== undefined) updates['about.cta.title'] = cta.title;
      if (cta.description !== undefined) updates['about.cta.description'] = cta.description;
    }

    const settings = await SiteSettings.updateSettings(updates);
    await clearProductCaches();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update services settings
router.put('/api/settings/services', requireAdminAuth, async (req, res) => {
  try {
    const { pageTitle, pageDescription, intro, items, cta } = req.body;

    const updates = {};

    if (pageTitle !== undefined) updates['services.pageTitle'] = pageTitle;
    if (pageDescription !== undefined) updates['services.pageDescription'] = pageDescription;

    if (intro) {
      if (intro.title !== undefined) updates['services.intro.title'] = intro.title;
      if (intro.description !== undefined) updates['services.intro.description'] = intro.description;
    }

    if (items !== undefined) {
      updates['services.items'] = items;
    }

    // CTA section
    if (cta) {
      if (cta.title !== undefined) updates['services.cta.title'] = cta.title;
      if (cta.description !== undefined) updates['services.cta.description'] = cta.description;
    }

    const settings = await SiteSettings.updateSettings(updates);
    await clearProductCaches();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update catalogue settings
router.put('/api/settings/catalogue', requireAdminAuth, async (req, res) => {
  try {
    const { pageTitle, pageDescription } = req.body;
    const updates = {};

    if (pageTitle !== undefined) updates['catalogue.pageTitle'] = pageTitle;
    if (pageDescription !== undefined) updates['catalogue.pageDescription'] = pageDescription;

    const settings = await SiteSettings.updateSettings(updates);
    await clearProductCaches();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST upload about page image
router.post('/api/settings/about/image', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const { section, stepIndex } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const settings = await SiteSettings.getSettings();
    let oldPublicId = null;
    let updatePath = '';

    // Determine which image to update
    if (section === 'story') {
      oldPublicId = settings.about?.story?.image?.publicId;
      updatePath = 'about.story.image';
    } else if (section === 'process' && stepIndex !== undefined) {
      const idx = parseInt(stepIndex);
      if (settings.about?.process?.steps?.[idx]) {
        oldPublicId = settings.about.process.steps[idx].image?.publicId;
        updatePath = `about.process.steps.${idx}.image`;
      }
    }

    if (!updatePath) {
      return res.status(400).json({ error: 'Invalid section specified' });
    }

    // Upload to Cloudinary with optimized settings
    const folder = 'pawana/about';
    const shortHash = Date.now().toString(36).slice(-4);
    const uniqueId = `${section}${stepIndex !== undefined ? '-' + stepIndex : ''}_${shortHash}`;

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder,
      publicId: uniqueId
    });

    // Delete old image if exists
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (e) {
        console.log('Could not delete old image:', e.message);
      }
    }

    // Update settings with new image
    const updates = {
      [updatePath]: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      }
    };

    await SiteSettings.updateSettings(updates);
    await clearProductCaches();

    res.json({
      success: true,
      image: { url: uploadResult.secure_url, publicId: uploadResult.public_id }
    });
  } catch (error) {
    console.error('About image upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload services page image
router.post('/api/settings/services/image', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    ensureCloudinaryConfig();
    const { itemIndex } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (itemIndex === undefined) {
      return res.status(400).json({ error: 'Item index required' });
    }

    const idx = parseInt(itemIndex);
    const settings = await SiteSettings.getSettings();

    let oldPublicId = null;
    if (settings.services?.items?.[idx]) {
      oldPublicId = settings.services.items[idx].image?.publicId;
    }

    // Upload to Cloudinary with optimized settings
    const folder = 'pawana/services';
    const shortHash = Date.now().toString(36).slice(-4);
    const uniqueId = `service-${idx}_${shortHash}`;

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder,
      publicId: uniqueId
    });

    // Delete old image if exists
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (e) {
        console.log('Could not delete old image:', e.message);
      }
    }

    // Update settings with new image
    const updates = {
      [`services.items.${idx}.image`]: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      }
    };

    await SiteSettings.updateSettings(updates);
    await clearProductCaches();

    res.json({
      success: true,
      image: { url: uploadResult.secure_url, publicId: uploadResult.public_id }
    });
  } catch (error) {
    console.error('Services image upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

