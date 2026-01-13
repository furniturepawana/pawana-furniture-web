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
// CONFIGURATION - Edit these for your update
// ==========================================

// Target document
const TARGET = {
  collection: "Room",  // "FurnitureItem" | "FurnitureSet" | "Room"
  findBy: "slug",               // "code" | "slug" | "name" | "_id"
  value: "living-room",              // The value to search for
};

// New image configuration
const NEW_IMAGE = {
  // Local path to the new image (relative to scripts folder or absolute)
  localPath: "../public/images/room-living.jpg",

  // Which image in the images[] array to replace (0 = first image)
  // Set to -1 to ADD a new image instead of replacing
  imageIndex: -1,

  // Cloudinary folder (leave empty to auto-generate based on document)
  // Example: "pawana/living-room/royal/items/chair"
  cloudinaryFolder: "rooms",
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
// UPDATE FUNCTION
// ==========================================

async function updateImage() {
  console.log("🚀 Image Update Script\n");

  // Validate configuration
  if (!COLLECTIONS[TARGET.collection]) {
    console.error(`❌ Invalid collection: ${TARGET.collection}`);
    console.log("   Valid options: FurnitureItem, FurnitureSet, Room");
    process.exit(1);
  }

  // Resolve image path
  const imagePath = path.isAbsolute(NEW_IMAGE.localPath)
    ? NEW_IMAGE.localPath
    : path.resolve(__dirname, NEW_IMAGE.localPath);

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image file not found: ${imagePath}`);
    process.exit(1);
  }

  console.log("Configuration:");
  console.log(`  Collection: ${TARGET.collection}`);
  console.log(`  Find by: ${TARGET.findBy} = "${TARGET.value}"`);
  console.log(`  Image: ${imagePath}`);
  console.log(`  Action: ${NEW_IMAGE.imageIndex === -1 ? "ADD new image" : `REPLACE image at index ${NEW_IMAGE.imageIndex}`}`);

  // Connect to database
  console.log("\n📡 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected.\n");

  const Model = COLLECTIONS[TARGET.collection];

  // Build query
  const query = {};
  if (TARGET.findBy === "_id") {
    query._id = TARGET.value;
  } else {
    query[TARGET.findBy] = TARGET.value;
  }

  // Find the document
  const doc = await Model.findOne(query);

  if (!doc) {
    console.error(`❌ No document found in ${TARGET.collection} where ${TARGET.findBy} = "${TARGET.value}"`);
    await mongoose.connection.close();
    process.exit(1);
  }

  console.log("📄 Found document:");
  console.log(`   Name: ${doc.name}`);
  console.log(`   Slug: ${doc.slug}`);
  if (doc.code) console.log(`   Code: ${doc.code}`);
  console.log(`   Current images: ${doc.images.length}`);

  // Validate image index for replacement
  if (NEW_IMAGE.imageIndex >= 0 && NEW_IMAGE.imageIndex >= doc.images.length) {
    console.error(`❌ Image index ${NEW_IMAGE.imageIndex} is out of bounds. Document has ${doc.images.length} images.`);
    console.log("   Set imageIndex to -1 to add a new image, or use a valid index.");
    await mongoose.connection.close();
    process.exit(1);
  }

  // Determine Cloudinary folder
  let cloudinaryFolder = NEW_IMAGE.cloudinaryFolder;
  if (!cloudinaryFolder) {
    // Auto-generate based on document type
    if (TARGET.collection === "FurnitureItem") {
      const roomSlug = doc.room.toLowerCase().replace(" ", "-");
      const styleSlug = doc.style.toLowerCase();
      const typeSlug = doc.type.toLowerCase();
      cloudinaryFolder = `pawana/${roomSlug}/${styleSlug}/items/${typeSlug}`;
    } else if (TARGET.collection === "FurnitureSet") {
      const roomSlug = doc.room.toLowerCase().replace(" ", "-");
      const styleSlug = doc.style.toLowerCase();
      cloudinaryFolder = `pawana/${roomSlug}/${styleSlug}/sets`;
    } else {
      cloudinaryFolder = "pawana/rooms";
    }
  }

  // Use code or slug as public_id
  const publicId = doc.code || doc.slug;

  console.log(`\n📤 Uploading to Cloudinary...`);
  console.log(`   Folder: ${cloudinaryFolder}`);
  console.log(`   Public ID: ${publicId}`);

  // Show old image if replacing
  if (NEW_IMAGE.imageIndex >= 0) {
    const oldImage = doc.images[NEW_IMAGE.imageIndex];
    console.log(`   Old URL: ${oldImage?.url || "(none)"}`);
  }

  // Upload to Cloudinary
  try {
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
    if (NEW_IMAGE.imageIndex === -1) {
      // Add new image
      doc.images.push(newImageData);
      console.log(`\n✅ Added new image (now ${doc.images.length} total)`);
    } else {
      // Replace existing image
      doc.images[NEW_IMAGE.imageIndex] = newImageData;
      console.log(`\n✅ Replaced image at index ${NEW_IMAGE.imageIndex}`);
    }

    await doc.save();

  } catch (uploadError) {
    console.error(`❌ Cloudinary upload failed: ${uploadError.message}`);
    await mongoose.connection.close();
    process.exit(1);
  }

  // Show final state
  console.log("\n📄 Final document images:");
  doc.images.forEach((img, i) => {
    console.log(`   [${i}] ${img.publicId}`);
    console.log(`       ${img.url}`);
  });

  // Close connection
  await mongoose.connection.close();
  console.log("\n👋 Done.\n");
}

// Run the script
updateImage().catch((err) => {
  console.error("❌ Error:", err);
  mongoose.connection.close();
  process.exit(1);
});
