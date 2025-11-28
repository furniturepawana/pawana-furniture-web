import mongoose from "mongoose";
import slugify from "slugify";

const furnitureItemSchema = new mongoose.Schema({
  room: {
    type: String,
    enum: ["Living Room", "Dining Room", "Bedroom", "Office", "Showpieces"],
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  style: {
    type: String,
    enum: ["Royal", "Modern", "Traditional"],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  images: {
    type: [
      {
        url: String,
        publicId: String,
      },
    ],
    default: [],
  },
  description: String,
  price: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-generate slug every time name changes
furnitureItemSchema.pre("validate", function (next) {
  if (this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model("FurnitureItem", furnitureItemSchema);
