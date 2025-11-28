import mongoose from "mongoose";
import dotenv from "dotenv";
import slugify from "slugify";
import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

dotenv.config({ path: "../.env" });

const MONGO_URL = process.env.DB_URI;

async function addSlugs() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to DB.");

  const models = [
    { name: "FurnitureItem", model: FurnitureItem },
    { name: "FurnitureSet", model: FurnitureSet },
    { name: "Room", model: Room }
  ];

  for (const { name, model } of models) {
    const docs = await model.find({ slug: { $exists: false } });

    for (const doc of docs) {
      doc.slug = slugify(doc.name, { lower: true, strict: true });
      await doc.save();
      console.log(`Updated slug for ${name}: ${doc.name}`);
    }
  }

  console.log("Slug update complete.");
  await mongoose.connection.close();
}

addSlugs().catch(err => {
  console.error(err);
  mongoose.connection.close();
});
