import mongoose from "mongoose";
import slugify from "slugify";

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["Living Room", "Dining Room", "Bedroom", "Office", "Showpieces"],
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
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
  // Featured image code - references a set or item code
  featuredCode: {
    type: String,
    default: ''
  },
  description: String,
  hasIndividualItems: {
    type: Boolean,
    default: true
  }
});

roomSchema.pre("validate", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model("Room", roomSchema);
