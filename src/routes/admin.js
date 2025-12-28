import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdminAuth, validateAdminLogin } from '../middleware/adminAuth.js';
import FurnitureSet from '../models/FurnitureSet.js';
import FurnitureItem from '../models/FurnitureItem.js';
import Room from '../models/Room.js';

const router = express.Router();

// Configure multer for memory storage (for Cloudinary uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP allowed.'));
    }
  }
});

// Lazy Cloudinary configuration (env vars loaded after import)
let cloudinaryConfigured = false;
function ensureCloudinaryConfig() {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinaryConfigured = true;
  }
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

// GET /admin-route - Login page
router.get('/', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect(`/${process.env.ADMIN_ROUTE}/dashboard`);
  }
  res.render('admin/login', {
    layout: false,
    error: null
  });
});

// POST /admin-route/login - Handle login
router.post('/login', (req, res) => {
  const { adminId, password } = req.body;

  if (validateAdminLogin(adminId, password)) {
    req.session.isAdmin = true;
    res.redirect(`/${process.env.ADMIN_ROUTE}/dashboard`);
  } else {
    res.render('admin/login', {
      layout: false,
      error: 'Invalid credentials. Please try again.'
    });
  }
});

// GET /admin-route/dashboard - Main dashboard
router.get('/dashboard', requireAdminAuth, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    res.render('admin/dashboard', {
      layout: false,
      rooms,
      adminRoute: process.env.ADMIN_ROUTE
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Server Error');
  }
});

// POST /admin-route/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect(`/${process.env.ADMIN_ROUTE}`);
  });
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

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: uniqueId,
            resource_type: 'image',
            format: 'webp',
            quality: 'auto:good'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
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

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: uniqueId,
            resource_type: 'image',
            format: 'webp',
            quality: 'auto:good'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
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
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API ROUTES - ROOMS
// ==========================================

// GET all rooms
router.get('/api/rooms', requireAdminAuth, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update room (no delete allowed)
router.put('/api/rooms/:id', requireAdminAuth, async (req, res) => {
  try {
    const { description, hasIndividualItems } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (description !== undefined) room.description = description;
    if (hasIndividualItems !== undefined) room.hasIndividualItems = hasIndividualItems;

    await room.save();
    res.json(room);
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

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: uniqueId,
          resource_type: 'image',
          format: 'webp',
          quality: 'auto:good'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
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

export default router;
