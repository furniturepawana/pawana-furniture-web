import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

dotenv.config({ path: "../.env" });

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MONGO_URL = process.env.DB_URI;
const basePicPath = path.join(__dirname, "../public/pics");

const collections = [
  {
    label: "items",
    path: path.join(basePicPath, "items"),
    model: FurnitureItem,
    cloudFolder: "pawana-furniture/items",
  },
  {
    label: "sets",
    path: path.join(basePicPath, "sets"),
    model: FurnitureSet,
    cloudFolder: "pawana-furniture/sets",
  },
  {
    label: "rooms",
    path: path.join(basePicPath, "rooms"),
    model: Room,
    cloudFolder: "pawana-furniture/rooms",
  },
];

async function uploadPics() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to DB.\n");

  for (const col of collections) {
    console.log(`=== Processing ${col.label.toUpperCase()} ===`);
    console.log(`Looking in: ${col.path}`);

    if (!fs.existsSync(col.path)) {
      console.warn(`✖ Folder not found: ${col.path}`);
      continue;
    }

    const files = fs.readdirSync(col.path);
    if (!files.length) {
      console.log(`No files found in ${col.path}`);
      continue;
    }

    for (const file of files) {
      const basename = path.parse(file).name; // slug
      const filePath = path.join(col.path, file);

      console.log(`📤 Uploading "${file}"...`);

      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: col.cloudFolder,
          public_id: basename,   // slug-based public_id
          overwrite: true,       // ensure updated images replace old ones
        });

        const doc = await col.model.findOne({ slug: basename });

        if (doc) {
          // Add new image object to 'images' array
          doc.images = [{
            url: result.secure_url,
            publicId: result.public_id,
          }];

          await doc.save();
          console.log(`✔ Updated "${doc.name}" with image: ${result.public_id}`);
        } else {
          console.warn(`✖ No matching document found for slug: "${basename}"`);
        }
      } catch (uploadErr) {
        console.error(`✖ Error uploading file ${file}:`, uploadErr.message);
      }
    }

    console.log(); // spacing
  }

  await mongoose.connection.close();
  console.log("All uploads complete. 🎉");
}

uploadPics().catch((err) => {
  console.error("Uncaught error:", err);
  mongoose.connection.close();
});
