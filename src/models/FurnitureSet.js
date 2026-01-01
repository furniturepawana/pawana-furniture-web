import mongoose from "mongoose";
import slugify from "slugify";

const furnitureSetSchema = new mongoose.Schema({
  room: {
    type: String,
    enum: ["Living Room", "Dining Room", "Bedroom", "Office", "Showpieces"],
    required: true
  },
  style: {
    type: String,
    enum: ["Royal", "Modern", "Traditional"],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FurnitureItem"
    }
  ],
  images: {
    type: [
      {
        url: String,
        publicId: String,
      },
    ],
    default: [],
  },
  description: String
});


// Auto-generate slug from name
furnitureSetSchema.pre("validate", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Indexes for faster search
furnitureSetSchema.index({ name: "text", code: "text", style: "text", room: "text" });
furnitureSetSchema.index({ style: 1 });
furnitureSetSchema.index({ room: 1 });

export default mongoose.model("FurnitureSet", furnitureSetSchema);
