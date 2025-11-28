import mongoose from "mongoose";
import dotenv from "dotenv";
import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

dotenv.config({ path: '../.env' })

const MONGO_URL = process.env.DB_URI;

// Styles apply everywhere
const styles = ["Royal", "Modernistic", "Traditional"];

// Room → furniture mapping
// Dining has no individual items now
const data = {
  "Living Room": {
    items: ["Sofa", "Chair", "Table"],
    hasItems: true
  },
  "Dining Room": {
    items: [],        // ← No individual items
    hasItems: false
  },
  Bedroom: {
    items: ["Side Table", "Bench"],
    hasItems: true
  },
  Office: {
    items: ["Boss Chair", "Visitor Chair", "Visitor Sofa"],
    hasItems: true
  },
  Showpieces: {
    items: ["Console", "Cabinet"],
    hasItems: true
  }
};

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to DB");

  // Clear old data
  await FurnitureItem.deleteMany({});
  await FurnitureSet.deleteMany({});
  await Room.deleteMany({});
  console.log("Old data cleared.");

  // Insert rooms
  await Room.insertMany(
    Object.keys(data).map(room => ({
      name: room,
      hasIndividualItems: data[room].hasItems
    }))
  );
  console.log("Room documents created.");

  // Build all individual furniture items
  let allItems = [];

  for (const room in data) {
    const types = data[room].items;

    for (const type of types) {
      for (const style of styles) {
        allItems.push({
          room,
          type,
          style,
          name: `${style} ${type}`,
          images: [],
          description: `${style} style ${type} for the ${room}.`
        });
      }
    }
  }

  // Insert the items
  const insertedItems = await FurnitureItem.insertMany(allItems);
  console.log("Inserted all individual items.");

  // Build sets (each room → 3 sets, each style)
  let setsToInsert = [];

  for (const room in data) {
    for (const style of styles) {
      const matchingItems = insertedItems.filter(
        item => item.room === room && item.style === style
      );

      setsToInsert.push({
        room,
        style,
        name: `${style} ${room} Set`,
        items: matchingItems.map(i => i._id),
        images: [],
        description: `A ${style} style set for the ${room}.`
      });
    }
  }

  // Insert the sets
  await FurnitureSet.insertMany(setsToInsert);
  console.log("Inserted all sets.");

  await mongoose.connection.close();
  console.log("Seeding complete. ✔");
}

seed().catch(err => console.error(err));
