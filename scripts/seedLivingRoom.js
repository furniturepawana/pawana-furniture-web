import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MONGO_URL = process.env.DB_URI;
const basePath = path.join(__dirname, "../public/Pawana Furniture/living-room");

// Living Room data structure
const livingRoomData = {
  royal: {
    styleCode: "LR",
    styleName: "Royal",
    sets: [
      { code: "LR-01", name: "Classic Leather Loveseat" },
      { code: "LR-02", name: "Light Tufted Chesterfield" },
      { code: "LR-03", name: "Minimalist Floating Sofa" },
      { code: "LR-04", name: "Regal Gold Carved" },
      { code: "LR-05", name: "Sleek Gray Sectional" },
      { code: "LR-06", name: "Tufted Chaise Lounge" },
      { code: "LR-07", name: "Velvet Button Settee" },
    ],
    items: {
      Chair: [
        { code: "LR-001", name: "Baroque Gilded Throne" },
        { code: "LR-002", name: "French Floral Fauteuil" },
        { code: "LR-003", name: "Gilded Velvet Cabriole" },
        { code: "LR-004", name: "Ornate Gold Damask" },
        { code: "LR-005", name: "Rococo Cane Chair" },
      ],
      Sofa: [
        { code: "LR-006", name: "Baroque Leather Chesterfield" },
        { code: "LR-007", name: "Bold Patina Armchair" },
        { code: "LR-008", name: "Classic Cognac Tufted" },
        { code: "LR-009", name: "Distressed Club Sofa" },
        { code: "LR-010", name: "Gilded Neoclassic Settee" },
        { code: "LR-011", name: "Ornate Damask Traditional" },
        { code: "LR-012", name: "Regal Black Velvet" },
        { code: "LR-013", name: "Tufted Empire Lounge" },
      ],
      Table: [
        { code: "LR-014", name: "Carved Marble Glass" },
        { code: "LR-015", name: "Emerald Baroque Console" },
        { code: "LR-016", name: "Grand Marble Console" },
        { code: "LR-017", name: "Imperial Gold Cabriole" },
        { code: "LR-018", name: "Marquetry Rococo Square" },
        { code: "LR-019", name: "Ornate Pedestal Entry" },
        { code: "LR-020", name: "Square Gilded Mirror" },
      ],
    },
  },
  traditional: {
    styleCode: "LT",
    styleName: "Traditional",
    sets: [
      { code: "LT-01", name: "Burgundy Tufted Settee" },
      { code: "LT-02", name: "Classic Linen Roll" },
      { code: "LT-03", name: "Formal Scroll Arm" },
      { code: "LT-04", name: "Sleek Chaise Lounge" },
    ],
    items: {
      Chair: [
        { code: "LT-001", name: "Aged Leather Club" },
        { code: "LT-002", name: "Baroque Gold Accent" },
        { code: "LT-003", name: "Classic Cognac Tufted1" },
        { code: "LT-004", name: "Classic Roll Arm" },
        { code: "LT-005", name: "French Cane Bergère" },
        { code: "LT-006", name: "Louis Oval Back" },
        { code: "LT-007", name: "Rococo Rose Tapestry" },
        { code: "LT-008", name: "Sleek Velvet Transitional" },
        { code: "LT-009", name: "Tropical Woven Accent" },
        { code: "LT-010", name: "Victorian Shell Back" },
      ],
      Sofa: [
        { code: "LT-011", name: "Contemporary Panel Sofa" },
        { code: "LT-012", name: "Grand Formal Scroll" },
        { code: "LT-013", name: "Modern Cigar Chesterfield" },
        { code: "LT-014", name: "Neoclassic Tufted Trim" },
        { code: "LT-015", name: "Sleek Gray Modular" },
        { code: "LT-016", name: "Traditional Carved Frame" },
      ],
      Table: [
        { code: "LT-017", name: "Clean White Modular" },
        { code: "LT-018", name: "Geometric Gold Glass" },
        { code: "LT-019", name: "Industrial Metal Grid" },
        { code: "LT-020", name: "Leather Inset Walnut" },
        { code: "LT-021", name: "Marble Drum Accent" },
        { code: "LT-022", name: "Modern Oval Leg" },
        { code: "LT-023", name: "Rococo Gilded Glass" },
        { code: "LT-024", name: "Vintage Storage Rectangle" },
      ],
    },
  },
  modern: {
    styleCode: "LM",
    styleName: "Modern",
    sets: [
      { code: "LM-01", name: "Crimson Accent Sofa" },
      { code: "LM-02", name: "Mid-Century Forest Sofa" },
      { code: "LM-03", name: "Velvet Modern Transitional" },
    ],
    items: {
      Chair: [
        { code: "LM-001", name: "Classic Carved Arm" },
        { code: "LM-002", name: "Elegant Tall Back" },
        { code: "LM-003", name: "Formal Estate Chair" },
        { code: "LM-004", name: "Leather Nailhead Club" },
        { code: "LM-005", name: "Modern Cognac Frame" },
        { code: "LM-006", name: "Natural Wood Lounge" },
      ],
      Sofa: [
        { code: "LM-007", name: "Classic Tufted Settee" },
        { code: "LM-008", name: "Cozy Velvet Lounge" },
        { code: "LM-009", name: "Glamorous Tufted Sofa" },
        { code: "LM-010", name: "Modern Panel Sofa" },
        { code: "LM-011", name: "Regal Tufted Chesterfield" },
      ],
      Table: [
        { code: "LM-012", name: "Curved Open Shelf" },
        { code: "LM-013", name: "Elevated Open Storage" },
        { code: "LM-014", name: "Floating Modern Walnut" },
        { code: "LM-015", name: "Geometric Inlay Storage" },
        { code: "LM-016", name: "Industrial Metal Leg" },
        { code: "LM-017", name: "Nordic Storage Rectangle" },
        { code: "LM-018", name: "Rounded Base Cabinet" },
        { code: "LM-019", name: "Squared Drawer Design" },
      ],
    },
  },
};

/**
 * Rename files to remove brackets from filenames
 */
function renameFilesRemoveBrackets(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠ Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);

    if (fs.statSync(fullPath).isDirectory()) {
      // Recursively process subdirectories
      renameFilesRemoveBrackets(fullPath);
    } else if (file.includes("(") || file.includes(")")) {
      // Remove brackets from filename
      const newFileName = file.replace(/[()]/g, "");
      const newPath = path.join(dirPath, newFileName);

      fs.renameSync(fullPath, newPath);
      console.log(`✔ Renamed: ${file} → ${newFileName}`);
    }
  });
}

/**
 * Upload a single image to Cloudinary
 */
async function uploadToCloudinary(filePath, cloudinaryPath, code) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: cloudinaryPath,
      public_id: code, // Use the code as the filename (e.g., LR-001, LM-05)
      overwrite: true,
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(`✖ Error uploading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Find image file for a given code
 */
function findImageFile(styleFolder, type, code) {
  const extensions = [".jpg", ".jpeg", ".png", ".webp", ".PNG"];

  for (const ext of extensions) {
    const filePath = path.join(styleFolder, type, `${code}${ext}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Main seeding function
 */
async function seedLivingRoom() {
  console.log("🚀 Starting Living Room Seeding Process...\n");

  // Step 1: Rename files to remove brackets
  console.log("📝 Step 1: Removing brackets from filenames...");
  renameFilesRemoveBrackets(basePath);
  console.log("✔ Filenames updated.\n");

  // Step 2: Connect to database
  console.log("📝 Step 2: Connecting to database...");
  await mongoose.connect(MONGO_URL);
  console.log("✔ Connected to MongoDB.\n");

  // Step 3: Remove existing Living Room items and sets
  console.log("📝 Step 3: Removing existing Living Room data...");
  const deletedItems = await FurnitureItem.deleteMany({ room: "Living Room" });
  const deletedSets = await FurnitureSet.deleteMany({ room: "Living Room" });
  console.log(`✔ Deleted ${deletedItems.deletedCount} items and ${deletedSets.deletedCount} sets.\n`);

  // Step 4: Process each style
  for (const [styleKey, styleData] of Object.entries(livingRoomData)) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Processing: ${styleData.styleName} (${styleData.styleCode})`);
    console.log("=".repeat(60));

    const styleFolder = path.join(basePath, styleKey);

    // Step 4a: Process Items
    console.log(`\n📦 Processing Items for ${styleData.styleName}...`);

    for (const [type, items] of Object.entries(styleData.items)) {
      const itemsFolder = path.join(styleFolder, "items", type.toLowerCase());

      for (const item of items) {
        console.log(`\n  → ${item.name} (${item.code})`);

        // Find image file
        const imageFile = findImageFile(itemsFolder, "", item.code);

        let imageData = null;
        if (imageFile) {
          console.log(`    📤 Uploading image...`);
          const cloudinaryPath = `pawana/living-room/${styleKey}/items/${type.toLowerCase()}`;
          imageData = await uploadToCloudinary(imageFile, cloudinaryPath, item.code);

          if (imageData) {
            console.log(`    ✔ Uploaded: ${imageData.publicId}`);
          }
        } else {
          console.warn(`    ⚠ Image not found for ${item.code}`);
        }

        // Create item document
        const itemDoc = new FurnitureItem({
          room: "Living Room",
          type: type,
          style: styleData.styleName,
          name: item.name,
          code: item.code,
          images: imageData ? [imageData] : [],
          description: `${item.name} - ${styleData.styleName} style ${type} for the Living Room.`,
        });

        await itemDoc.save();
        console.log(`    ✔ Saved to database`);
      }
    }

    // Step 4b: Process Sets
    console.log(`\n\n📦 Processing Sets for ${styleData.styleName}...`);

    const setsFolder = path.join(styleFolder, "sets");

    for (const set of styleData.sets) {
      console.log(`\n  → ${set.name} (${set.code})`);

      // Find image file
      const imageFile = findImageFile(setsFolder, "", set.code);

      let imageData = null;
      if (imageFile) {
        console.log(`    📤 Uploading image...`);
        const cloudinaryPath = `pawana/living-room/${styleKey}/sets`;
        imageData = await uploadToCloudinary(imageFile, cloudinaryPath, set.code);

        if (imageData) {
          console.log(`    ✔ Uploaded: ${imageData.publicId}`);
        }
      } else {
        console.warn(`    ⚠ Image not found for ${set.code}`);
      }

      // Create set document (with empty items array as requested)
      const setDoc = new FurnitureSet({
        room: "Living Room",
        style: styleData.styleName,
        name: set.name,
        code: set.code,
        items: [], // Empty array as requested
        images: imageData ? [imageData] : [],
        description: `${set.name} - ${styleData.styleName} style set for the Living Room.`,
      });

      await setDoc.save();
      console.log(`    ✔ Saved to database`);
    }
  }

  // Step 5: Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));

  const totalItems = await FurnitureItem.countDocuments({ room: "Living Room" });
  const totalSets = await FurnitureSet.countDocuments({ room: "Living Room" });

  console.log(`✔ Total Items Created: ${totalItems}`);
  console.log(`✔ Total Sets Created: ${totalSets}`);

  // Close connection
  await mongoose.connection.close();
  console.log("\n✅ Living Room seeding complete! 🎉\n");
}

// Run the script
seedLivingRoom().catch((err) => {
  console.error("❌ Error during seeding:", err);
  mongoose.connection.close();
  process.exit(1);
});
