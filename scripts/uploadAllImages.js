import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MONGO_URL = process.env.DB_URI;

// ==========================================
// CONFIGURATION - Edit these to control upload
// ==========================================
const CONFIG = {
  rooms: {
    livingRoom: false,    // Already uploaded, set to true to re-upload
    diningRoom: true,     // Sets only
    bedroom: true,        // Sets only
    office: true,         // Sets only
    showpieces: true,     // Items only (Cabinet, Console, Fireplace)
  },
  overwriteCloudinary: true,   // Overwrite existing images in Cloudinary
  basePath: path.join(__dirname, "../public/Pawana-Furniture"),
  cloudinaryBaseFolder: "pawana",  // Base folder in Cloudinary
};

// Room folder mappings
const ROOM_FOLDERS = {
  livingRoom: "living-room",
  diningRoom: "dining-room",
  bedroom: "bedroom",
  office: "office",
  showpieces: "showpieces",
};

const ROOM_NAMES = {
  livingRoom: "Living Room",
  diningRoom: "Dining Room",
  bedroom: "Bedroom",
  office: "Office",
  showpieces: "Showpieces",
};

/**
 * Dynamically detect if a room has items or sets based on folder existence
 */
function detectRoomConfig(roomPath) {
  const itemsPath = path.join(roomPath, "items");
  const setsPath = path.join(roomPath, "sets");

  // Check if items folder exists and has content
  let hasItems = false;
  if (fs.existsSync(itemsPath)) {
    const itemContents = fs.readdirSync(itemsPath);
    hasItems = itemContents.some(f => fs.statSync(path.join(itemsPath, f)).isDirectory());
  }

  // Check if sets folder exists and has content
  let hasSets = false;
  if (fs.existsSync(setsPath)) {
    const setContents = fs.readdirSync(setsPath);
    hasSets = setContents.some(f => fs.statSync(path.join(setsPath, f)).isDirectory());
  }

  return { hasItems, hasSets };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Find all image files in a directory
 */
function findImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const extensions = [".jpg", ".jpeg", ".png", ".webp", ".PNG", ".JPG", ".JPEG", ".WEBP"];
  const files = fs.readdirSync(dirPath);

  return files.filter(file => {
    const ext = path.extname(file);
    return extensions.includes(ext);
  });
}

/**
 * Upload a single image to Cloudinary
 */
async function uploadToCloudinary(filePath, cloudinaryFolder, publicId) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: cloudinaryFolder,
      public_id: publicId,
      overwrite: CONFIG.overwriteCloudinary,
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(`    ❌ Upload failed: ${error.message}`);
    return null;
  }
}

/**
 * Process items for a room (like Living Room and Showpieces)
 * Folder structure: room/items/style/type/CODE.webp
 */
async function processItems(roomPath, roomName, folderName, cloudinaryBase) {
  const itemsPath = path.join(roomPath, "items");

  if (!fs.existsSync(itemsPath)) {
    console.log(`    ⚠️  No items folder found at: ${itemsPath}`);
    return 0;
  }

  let uploadCount = 0;

  // Get style folders (modern, royal, traditional)
  const styleFolders = fs.readdirSync(itemsPath).filter(f =>
    fs.statSync(path.join(itemsPath, f)).isDirectory()
  );

  for (const styleFolderName of styleFolders) {
    const stylePath = path.join(itemsPath, styleFolderName);
    console.log(`\n    📂 Style: ${styleFolderName}`);

    // Get type folders (chair, sofa, table, cabinet, console, fireplace)
    const typeFolders = fs.readdirSync(stylePath).filter(f =>
      fs.statSync(path.join(stylePath, f)).isDirectory()
    );

    for (const typeFolderName of typeFolders) {
      const typePath = path.join(stylePath, typeFolderName);
      const imageFiles = findImageFiles(typePath);

      console.log(`       📁 ${typeFolderName}: ${imageFiles.length} files`);

      for (const imageFile of imageFiles) {
        const code = path.parse(imageFile).name;
        const filePath = path.join(typePath, imageFile);

        // Find document by code
        const doc = await FurnitureItem.findOne({ code, room: roomName });

        if (!doc) {
          console.log(`          ⚠️  No document for code: ${code}`);
          continue;
        }

        console.log(`          📤 ${code} (${doc.name})`);

        const cloudinaryFolder = `${cloudinaryBase}/items/${styleFolderName}/${typeFolderName}`;
        const imageData = await uploadToCloudinary(filePath, cloudinaryFolder, code);

        if (imageData) {
          doc.images = [imageData];
          await doc.save();
          console.log(`             ✔ Uploaded`);
          uploadCount++;
        }
      }
    }
  }

  return uploadCount;
}

/**
 * Process sets for a room (Diningroom, Bedroom, Office have sets only)
 * Folder structure: room/sets/style/CODE.webp
 */
async function processSets(roomPath, roomName, folderName, cloudinaryBase) {
  const setsPath = path.join(roomPath, "sets");

  if (!fs.existsSync(setsPath)) {
    console.log(`    ⚠️  No sets folder found at: ${setsPath}`);
    return 0;
  }

  let uploadCount = 0;

  // Get style folders (modern, royal, traditional)
  const styleFolders = fs.readdirSync(setsPath).filter(f =>
    fs.statSync(path.join(setsPath, f)).isDirectory()
  );

  for (const styleFolderName of styleFolders) {
    const stylePath = path.join(setsPath, styleFolderName);
    const imageFiles = findImageFiles(stylePath);

    console.log(`\n    📂 Style: ${styleFolderName} (${imageFiles.length} sets)`);

    for (const imageFile of imageFiles) {
      const code = path.parse(imageFile).name;
      const filePath = path.join(stylePath, imageFile);

      // Find document by code
      const doc = await FurnitureSet.findOne({ code, room: roomName });

      if (!doc) {
        console.log(`       ⚠️  No document for code: ${code}`);
        continue;
      }

      console.log(`       📤 ${code} (${doc.name})`);

      const cloudinaryFolder = `${cloudinaryBase}/sets/${styleFolderName}`;
      const imageData = await uploadToCloudinary(filePath, cloudinaryFolder, code);

      if (imageData) {
        doc.images = [imageData];
        await doc.save();
        console.log(`          ✔ Uploaded`);
        uploadCount++;
      }
    }
  }

  return uploadCount;
}

/**
 * Process a single room
 */
async function processRoom(roomKey) {
  const folderName = ROOM_FOLDERS[roomKey];
  const roomName = ROOM_NAMES[roomKey];
  const roomPath = path.join(CONFIG.basePath, folderName);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📦 Processing: ${roomName}`);
  console.log(`   Path: ${roomPath}`);

  if (!fs.existsSync(roomPath)) {
    console.log(`❌ Folder not found: ${roomPath}`);
    return { items: 0, sets: 0 };
  }

  // Dynamically detect if room has items/sets based on folder structure
  const roomConfig = detectRoomConfig(roomPath);
  console.log(`   Has Items: ${roomConfig.hasItems}, Has Sets: ${roomConfig.hasSets}`);
  console.log("=".repeat(60));

  let totalItems = 0;
  let totalSets = 0;

  const cloudinaryBase = `${CONFIG.cloudinaryBaseFolder}/${folderName}`;

  // Process items if room has individual items
  if (roomConfig.hasItems) {
    const itemCount = await processItems(roomPath, roomName, folderName, cloudinaryBase);
    totalItems = itemCount;
  }

  // Process sets if room has sets
  if (roomConfig.hasSets) {
    const setCount = await processSets(roomPath, roomName, folderName, cloudinaryBase);
    totalSets = setCount;
  }

  console.log(`\n  📊 Room Total: ${totalItems} items, ${totalSets} sets`);
  return { items: totalItems, sets: totalSets };
}

/**
 * Upload room images (for the Room collection itself)
 */
async function uploadRoomImages() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("📦 Processing Room Collection Images");
  console.log("=".repeat(60));

  const roomImagesPath = path.join(CONFIG.basePath, "..", "rooms");

  if (!fs.existsSync(roomImagesPath)) {
    console.log(`⚠️  No rooms folder found at: ${roomImagesPath}`);
    return 0;
  }

  const imageFiles = findImageFiles(roomImagesPath);
  let uploadCount = 0;

  for (const imageFile of imageFiles) {
    // Extract slug from filename like "room-living.webp" -> "living-room"
    const baseName = path.parse(imageFile).name;

    // Try to find room by matching the filename
    let doc = null;

    // Check common naming patterns
    if (baseName.includes("living")) {
      doc = await Room.findOne({ slug: "living-room" });
    } else if (baseName.includes("dining")) {
      doc = await Room.findOne({ slug: "dining-room" });
    } else if (baseName.includes("bedroom")) {
      doc = await Room.findOne({ slug: "bedroom" });
    } else if (baseName.includes("office")) {
      doc = await Room.findOne({ slug: "office" });
    } else if (baseName.includes("showpiece")) {
      doc = await Room.findOne({ slug: "showpieces" });
    }

    if (!doc) {
      // Try exact slug match
      doc = await Room.findOne({ slug: baseName });
    }

    if (!doc) {
      console.log(`  ⚠️  No Room document found for: ${baseName}`);
      continue;
    }

    const filePath = path.join(roomImagesPath, imageFile);
    console.log(`  📤 Uploading: ${imageFile} -> ${doc.name}`);

    const cloudinaryFolder = `${CONFIG.cloudinaryBaseFolder}/rooms`;
    const imageData = await uploadToCloudinary(filePath, cloudinaryFolder, doc.slug);

    if (imageData) {
      doc.images = [imageData];
      await doc.save();
      console.log(`     ✔ Uploaded & saved`);
      uploadCount++;
    }
  }

  return uploadCount;
}

/**
 * Main upload function
 */
async function uploadAllImages() {
  console.log("🚀 Starting Image Upload Process...\n");
  console.log("Configuration:");
  console.log(`  Base Path: ${CONFIG.basePath}`);
  console.log(`  Cloudinary Folder: ${CONFIG.cloudinaryBaseFolder}`);
  console.log(`  Overwrite: ${CONFIG.overwriteCloudinary}`);
  console.log("  Rooms:", Object.entries(CONFIG.rooms)
    .map(([k, v]) => `${k}=${v}`)
    .join(", "));

  // Connect to database
  console.log("\n📡 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected.");

  let grandTotalItems = 0;
  let grandTotalSets = 0;

  // Process each enabled room
  for (const [roomKey, enabled] of Object.entries(CONFIG.rooms)) {
    if (!enabled) {
      console.log(`\n⏭️  Skipping: ${roomKey} (disabled in config)`);
      continue;
    }

    const { items, sets } = await processRoom(roomKey);
    grandTotalItems += items;
    grandTotalSets += sets;
  }

  // Also check for room images
  const roomImageCount = await uploadRoomImages();

  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(60));
  console.log(`✔ Total Item Images Uploaded: ${grandTotalItems}`);
  console.log(`✔ Total Set Images Uploaded: ${grandTotalSets}`);
  console.log(`✔ Total Room Images Uploaded: ${roomImageCount}`);

  // Close connection
  await mongoose.connection.close();
  console.log("\n✅ Image upload complete! 🎉\n");
}

// Run the script
uploadAllImages().catch((err) => {
  console.error("❌ Error during upload:", err);
  mongoose.connection.close();
  process.exit(1);
});
