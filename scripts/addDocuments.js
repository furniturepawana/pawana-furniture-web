/**
 * Add Documents Script
 *
 * Add single or multiple furniture items/sets to the database with Cloudinary image upload.
 * Checks for conflicts before adding.
 *
 * Usage: node scripts/addDocuments.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Configure Cloudinary
// Cloudinary auto-configured via CLOUDINARY_URL environment variable

// ==========================================
// CONFIGURATION - Edit these to add documents
// ==========================================

/**
 * Type of documents to add: "FurnitureItem" | "FurnitureSet"
 */
const DOCUMENT_TYPE = "FurnitureSet";

/**
 * Documents to add. Each document should have:
 *
 * For FurnitureSet:
 *   - room: "Living Room" | "Dining Room" | "Bedroom" | "Office" | "Showpieces"
 *   - style: "Royal" | "Traditional" | "Modern"
 *   - name: "Display Name"
 *   - code: "LR-01" (unique code)
 *   - description: "Optional description"
 *   - imagePath: "path/to/image.jpg" (relative to scripts folder or absolute)
 *
 * For FurnitureItem:
 *   - room, style, name, code, description, imagePath (same as above)
 *   - type: "Chair" | "Sofa" | "Table" | etc.
 *   - price: 25000 (optional)
 */
const DOCUMENTS_TO_ADD = [
  // Example Set:
  // {
  //   room: "Living Room",
  //   style: "Royal",
  //   name: "Elegant Victorian Set",
  //   code: "LR-08",
  //   description: "A beautiful Victorian-style living room set",
  //   imagePath: "../public/Pawana-Furniture/living-room/sets/royal/LR-08.webp"
  // },

  {

  room: "Living Room",
  style: "Royal",
  name: "Classic Leather Loveseat",
  code: "LR-01",
  description: "Classic Leather Loveseat - Royal style set for the Living Room.",
  imagePath: "../public/Pawana-Furniture/living-room/sets/royal/LR-01.webp"
}

  // Example Item:
  // {
  //   room: "Living Room",
  //   style: "Royal",
  //   type: "Chair",
  //   name: "Royal Accent Chair",
  //   code: "LR-021",
  //   description: "Elegant accent chair with gold trim",
  //   price: 15000,
  //   imagePath: "../public/Pawana-Furniture/living-room/items/royal/chair/LR-021.webp"
  // },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getModel(type) {
  switch (type) {
    case "FurnitureItem":
      return FurnitureItem;
    case "FurnitureSet":
      return FurnitureSet;
    case "Room":
      return Room;
    default:
      throw new Error(`Invalid document type: ${type}`);
  }
}

function getCloudinaryFolder(doc, type) {
  const roomSlug = doc.room.toLowerCase().replace(" ", "-");
  const styleSlug = doc.style.toLowerCase();

  if (type === "FurnitureSet") {
    return `pawana/${roomSlug}/${styleSlug}/sets`;
  } else {
    return `pawana/${roomSlug}/${styleSlug}/items`;
  }
}

async function uploadImage(imagePath, folder, publicId) {
  const fullPath = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(__dirname, imagePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Image not found: ${fullPath}`);
  }

  console.log(`   📤 Uploading image: ${path.basename(fullPath)}`);

  const result = await cloudinary.uploader.upload(fullPath, {
    folder,
    public_id: publicId,
    resource_type: "image",
    format: "webp",
    quality: "auto:good",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

async function checkConflicts(Model, doc) {
  const conflicts = [];

  // Check code conflict
  if (doc.code) {
    const existingByCode = await Model.findOne({ code: doc.code });
    if (existingByCode) {
      conflicts.push(`Code "${doc.code}" already exists`);
    }
  }

  // Check name conflict (same room + style + name)
  const query = { name: doc.name };
  if (doc.room) query.room = doc.room;
  if (doc.style) query.style = doc.style;

  const existingByName = await Model.findOne(query);
  if (existingByName) {
    conflicts.push(`Name "${doc.name}" already exists in ${doc.room} - ${doc.style}`);
  }

  return conflicts;
}

// ==========================================
// MAIN SCRIPT
// ==========================================

async function addDocuments() {
  console.log("🚀 Add Documents Script\n");

  if (DOCUMENTS_TO_ADD.length === 0) {
    console.log("⚠️  No documents to add. Edit DOCUMENTS_TO_ADD in the script.");
    process.exit(0);
  }

  console.log(`📋 Documents to add: ${DOCUMENTS_TO_ADD.length}`);
  console.log(`📁 Document type: ${DOCUMENT_TYPE}\n`);

  // Connect to database
  console.log("📡 Connecting to MongoDB...");
  await mongoose.connect(process.env.DB_URI);
  console.log("✅ Connected.\n");

  const Model = getModel(DOCUMENT_TYPE);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < DOCUMENTS_TO_ADD.length; i++) {
    const docData = DOCUMENTS_TO_ADD[i];
    console.log(`\n[${i + 1}/${DOCUMENTS_TO_ADD.length}] Processing: ${docData.name}`);
    console.log(`   Code: ${docData.code}`);

    try {
      // Check for conflicts
      const conflicts = await checkConflicts(Model, docData);
      if (conflicts.length > 0) {
        console.log(`   ❌ Conflicts found:`);
        conflicts.forEach((c) => console.log(`      - ${c}`));
        errorCount++;
        continue;
      }

      // Upload image if provided
      let imageData = null;
      if (docData.imagePath) {
        const folder = getCloudinaryFolder(docData, DOCUMENT_TYPE);
        const shortHash = Date.now().toString(36).slice(-4);
        const publicId = `${docData.code}_${shortHash}`;
        imageData = await uploadImage(docData.imagePath, folder, publicId);
        console.log(`   ✅ Image uploaded: ${imageData.publicId}`);
      }

      // Prepare document data
      const newDocData = {
        room: docData.room,
        style: docData.style,
        name: docData.name,
        code: docData.code,
        description: docData.description || "",
        images: imageData ? [imageData] : [],
      };

      // Add type-specific fields
      if (DOCUMENT_TYPE === "FurnitureItem") {
        newDocData.type = docData.type;
        if (docData.price) newDocData.price = docData.price;
      }

      // Create and save document
      const newDoc = new Model(newDocData);
      await newDoc.save();

      console.log(`   ✅ Document saved: ${newDoc.slug}`);
      successCount++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log("=".repeat(50));

  await mongoose.connection.close();
  console.log("\n👋 Done.\n");
}

// Run the script
addDocuments().catch((err) => {
  console.error("❌ Fatal error:", err);
  mongoose.connection.close();
  process.exit(1);
});
