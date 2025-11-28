import mongoose from "mongoose";
import dotenv from "dotenv";
import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

dotenv.config({ path: "../.env" });

const MONGO_URL = process.env.DB_URI;

async function logSlugs() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to DB.\n");

  // Helper function to log slugs
  const logCollectionSlugs = async (model, label) => {
    const docs = await model.find({}, "name slug").sort("name");
    console.log(`=== ${label} ===`);
    if (docs.length === 0) {
      console.log("No documents found.");
    } else {
      docs.forEach(doc => console.log(`- ${doc.name} → ${doc.slug}`));
    }
    console.log("\n");
  };

  await logCollectionSlugs(FurnitureItem, "Furniture Items");
  await logCollectionSlugs(FurnitureSet, "Furniture Sets");
  await logCollectionSlugs(Room, "Rooms");

  await mongoose.connection.close();
  console.log("Done.");
}

logSlugs().catch(err => {
  console.error(err);
  mongoose.connection.close();
});
