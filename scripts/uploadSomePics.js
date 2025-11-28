import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({
  path: path.join(__dirname, "../.env"),
});

// MongoDB URL
const MONGO_URL = process.env.MONGODB_URI || process.env.DB_URI;
if (!MONGO_URL) {
  console.error("❌ ERROR: DB URI not found. Add MONGODB_URI or DB_URI to .env");
  process.exit(1);
}

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===============================
// IMAGES TO REPLACE
// slug : path-to-image
// ===============================

const IMAGES_TO_REPLACE = {
  "royal-living-room-set": "../public/pics/sets/royal-living-room-set.webp",
  "royal-office-set": "../public/pics/sets/royal-office-set.webp",
  "royal-showpieces-set": "../public/pics/sets/royal-showpieces-set.webp",
  "traditional-bedroom-set": "../public/pics/sets/traditional-bedroom-set.jpg",
  "traditional-living-room-set": "../public/pics/sets/traditional-living-room-set.jpg",
  "traditional-office-set": "../public/pics/sets/traditional-office-set.webp",
};

// Maps to each collection for searching
const COLLECTIONS = [
  { model: FurnitureItem, folder: "pawana-furniture/items" },
  { model: FurnitureSet, folder: "pawana-furniture/sets" },
  { model: Room, folder: "pawana-furniture/rooms" },
];

async function replaceImage(slug, localImagePath) {
  // Resolve absolute path
  const resolvedPath = path.isAbsolute(localImagePath)
    ? localImagePath
    : path.resolve(__dirname, localImagePath);

  if (!fs.existsSync(resolvedPath)) {
    console.log(`❌ File not found: ${resolvedPath}`);
    return false;
  }

  let foundDoc = null;
  let collection = null;

  // Find the document in any collection
  for (const col of COLLECTIONS) {
    const doc = await col.model.findOne({ slug });
    if (doc) {
      foundDoc = doc;
      collection = col;
      break;
    }
  }

  if (!foundDoc) {
    console.log(`❌ No document found for slug: ${slug}`);
    return false;
  }

  console.log(`📦 Updating image for: ${foundDoc.name || slug}`);

  // Upload new image to Cloudinary (overwrite)
  const publicId = `${collection.folder}/${slug}`;

  const result = await cloudinary.uploader.upload(resolvedPath, {
    folder: collection.folder,
    public_id: slug,
    overwrite: true,
  });

  // Find the matching image object in DB images[]
  const imgIndex = foundDoc.images.findIndex((img) =>
    img.publicId.endsWith(`/${slug}`)
  );

  if (imgIndex === -1) {
    console.log(`❌ No matching image object found in DB for ${slug}`);
    return false;
  }

  // Update ONLY the url (publicId stays same)
  foundDoc.images[imgIndex].url = result.secure_url;

  await foundDoc.save();

  console.log(`✔ Updated DB image URL for slug: ${slug}`);
  return true;
}

async function main() {
  try {
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected.\n");

    for (const [slug, imgPath] of Object.entries(IMAGES_TO_REPLACE)) {
      try {
        await replaceImage(slug, imgPath);
      } catch (err) {
        console.error(`❌ Error processing ${slug}:`, err.message);
      }
      console.log("");
    }
  } catch (err) {
    console.error("❌ Fatal Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from DB.");
  }
}

main();
