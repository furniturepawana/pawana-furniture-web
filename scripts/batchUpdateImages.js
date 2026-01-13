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
// Cloudinary auto-configured via CLOUDINARY_URL environment variable

const MONGO_URL = process.env.DB_URI;

// ==========================================
// BATCH CONFIGURATION - Define multiple updates
// ==========================================

// Array of room updates to process
const ROOM_UPDATES = [
  {
    slug: "living-room",           // Room slug to find
    localPath: "../public/rooms/room-living.webp", // Local image path
    imageIndex: 0,                // -1 to add, 0+ to replace specific index
  },
  {
    slug: "dining-room",           // Room slug to find
    localPath: "../public/rooms/room-dining.webp",            // Local image path
    imageIndex: 0,                // -1 to add, 0+ to replace specific index
  },
  {
    slug: "office",               // Room slug to find
    localPath: "../public/rooms/room-office.webp",             // Local image path
    imageIndex: 0,                // -1 to add, 0+ to replace specific index
  },
  {
    slug: "showpieces",                 // Room slug to find
    localPath: "../public/rooms/room-showpieces.webp",             // Local image path
    imageIndex: 0,                // -1 to add, 0+ to replace specific index
  },
   {
    slug: "bedroom",           // Room slug to find
    localPath: "../public/rooms/room-bedroom.webp", // Local image path
    imageIndex: 0,                // -1 to add, 0+ to replace specific index
  }
  // Add more rooms as needed
];

// Global configuration for all updates
const GLOBAL_CONFIG = {
  collection: "Room",              // "FurnitureItem" | "FurnitureSet" | "Room"
  findBy: "slug",                  // "code" | "slug" | "name" | "_id"
  cloudinaryFolder: "rooms",       // Cloudinary folder for all uploads
};

// ==========================================
// COLLECTION MAPPING
// ==========================================

const COLLECTIONS = {
  FurnitureItem: FurnitureItem,
  FurnitureSet: FurnitureSet,
  Room: Room,
};

// ==========================================
// BATCH UPDATE FUNCTION
// ==========================================

async function batchUpdateImages() {
  console.log("🚀 Batch Image Update Script\n");

  // Validate configuration
  if (!COLLECTIONS[GLOBAL_CONFIG.collection]) {
    console.error(`❌ Invalid collection: ${GLOBAL_CONFIG.collection}`);
    console.log("   Valid options: FurnitureItem, FurnitureSet, Room");
    process.exit(1);
  }

  console.log("Configuration:");
  console.log(`  Collection: ${GLOBAL_CONFIG.collection}`);
  console.log(`  Find by: ${GLOBAL_CONFIG.findBy}`);
  console.log(`  Cloudinary folder: ${GLOBAL_CONFIG.cloudinaryFolder}`);
  console.log(`  Number of updates to process: ${ROOM_UPDATES.length}\n`);

  // Validate all image paths exist before starting
  console.log("🔍 Validating image paths...");
  for (const update of ROOM_UPDATES) {
    const imagePath = path.isAbsolute(update.localPath)
      ? update.localPath
      : path.resolve(__dirname, update.localPath);

    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Image file not found: ${imagePath}`);
      console.log(`   For room: ${update.slug}`);
      process.exit(1);
    }
  }
  console.log("✅ All image paths validated.\n");

  // Connect to database
  console.log("📡 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected.\n");

  const Model = COLLECTIONS[GLOBAL_CONFIG.collection];
  let successCount = 0;
  let errorCount = 0;

  // Process each update
  for (const update of ROOM_UPDATES) {
    console.log(`\n--- Processing room: ${update.slug} ---`);

    try {
      // Resolve image path
      const imagePath = path.isAbsolute(update.localPath)
        ? update.localPath
        : path.resolve(__dirname, update.localPath);

      // Build query
      const query = {};
      if (GLOBAL_CONFIG.findBy === "_id") {
        query._id = update.slug; // Using slug field as value here
      } else {
        query[GLOBAL_CONFIG.findBy] = update.slug;
      }

      // Find the document
      const doc = await Model.findOne(query);

      if (!doc) {
        console.error(`❌ No document found in ${GLOBAL_CONFIG.collection} where ${GLOBAL_CONFIG.findBy} = "${update.slug}"`);
        errorCount++;
        continue;
      }

      console.log("📄 Found document:");
      console.log(`   Name: ${doc.name}`);
      console.log(`   Slug: ${doc.slug}`);
      if (doc.code) console.log(`   Code: ${doc.code}`);
      console.log(`   Current images: ${doc.images.length}`);

      // Validate image index for replacement
      if (update.imageIndex >= 0 && update.imageIndex >= doc.images.length) {
        console.error(`❌ Image index ${update.imageIndex} is out of bounds. Document has ${doc.images.length} images.`);
        console.log("   Set imageIndex to -1 to add a new image, or use a valid index.");
        errorCount++;
        continue;
      }

      // Determine Cloudinary folder
      const cloudinaryFolder = GLOBAL_CONFIG.cloudinaryFolder;

      // Use code or slug as public_id
      const publicId = doc.code || doc.slug;

      console.log(`\n📤 Uploading to Cloudinary...`);
      console.log(`   Folder: ${cloudinaryFolder}`);
      console.log(`   Public ID: ${publicId}`);

      // Show old image if replacing
      if (update.imageIndex >= 0) {
        const oldImage = doc.images[update.imageIndex];
        console.log(`   Old URL: ${oldImage?.url || "(none)"}`);
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: cloudinaryFolder,
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      });

      const newImageData = {
        url: result.secure_url,
        publicId: result.public_id,
      };

      console.log(`   New URL: ${newImageData.url}`);

      // Update or add image
      if (update.imageIndex === -1) {
        // Add new image
        doc.images.push(newImageData);
        console.log(`\n✅ Added new image (now ${doc.images.length} total)`);
      } else {
        // Replace existing image
        doc.images[update.imageIndex] = newImageData;
        console.log(`\n✅ Replaced image at index ${update.imageIndex}`);
      }

      await doc.save();
      successCount++;

      // Show final state for this document
      console.log("\n📄 Final document images:");
      doc.images.forEach((img, i) => {
        console.log(`   [${i}] ${img.publicId}`);
        console.log(`       ${img.url}`);
      });

    } catch (error) {
      console.error(`❌ Error processing room ${update.slug}: ${error.message}`);
      errorCount++;
    }
  }

  // Close connection
  await mongoose.connection.close();

  console.log("\n📊 Batch Update Summary:");
  console.log(`   ✅ Successful updates: ${successCount}`);
  console.log(`   ❌ Failed updates: ${errorCount}`);
  console.log("\n👋 Batch update complete.\n");
}

// Run the script
batchUpdateImages().catch((err) => {
  console.error("❌ Uncaught error:", err);
  mongoose.connection.close();
  process.exit(1);
});