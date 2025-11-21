# UploadSomePics.js Script

## Purpose
This script allows you to replace specific images for furniture items, sets, or rooms by their slug. It will:
1. Upload the new image to Cloudinary
2. Delete the old image from Cloudinary
3. Update the database with the new image URL and public ID

## Location
Save this file as: `scripts/UploadSomePics.js`

## Complete Script Code

```javascript
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION - EDIT THIS SECTION
// ============================================

/**
 * Define which images to replace here
 * Format: { slug: "local-image-path" }
 *
 * The slug is the unique identifier for the item/set/room
 * The path should be relative to the project root or absolute
 */
const IMAGES_TO_REPLACE = {
  // ITEMS - Replace individual furniture item images
  "traditional-sofa": "./public/images/new-traditional-sofa.jpg",
  "modern-table": "./public/images/new-modern-table.jpg",

  // SETS - Replace furniture set images
  "royal-bedroom-set": "./public/images/new-royal-bedroom.jpg",

  // ROOMS - Replace room images
  "living-room": "./public/images/new-living-room.jpg",
};

/**
 * Image index to replace (0 = first image, 1 = second image, etc.)
 * Set to 0 to replace the main/first image
 */
const IMAGE_INDEX_TO_REPLACE = 0;

/**
 * Cloudinary folder structure
 */
const CLOUDINARY_FOLDERS = {
  items: "pawana-furniture/items",
  sets: "pawana-furniture/sets",
  rooms: "pawana-furniture/rooms",
};

// ============================================
// END CONFIGURATION
// ============================================

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 */
async function uploadToCloudinary(imagePath, folder, publicId) {
  try {
    console.log(\`📤 Uploading \${imagePath} to Cloudinary...\`);

    const result = await cloudinary.uploader.upload(imagePath, {
      folder: folder,
      public_id: publicId,
      overwrite: true, // Overwrite if exists
      resource_type: "image",
    });

    console.log(\`✅ Uploaded successfully: \${result.secure_url}\`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(\`❌ Error uploading \${imagePath}:\`, error.message);
    throw error;
  }
}

/**
 * Delete old image from Cloudinary
 */
async function deleteFromCloudinary(publicId) {
  try {
    console.log(\`🗑️  Deleting old image: \${publicId}\`);
    await cloudinary.uploader.destroy(publicId);
    console.log(\`✅ Deleted successfully\`);
  } catch (error) {
    console.error(\`⚠️  Warning: Could not delete old image \${publicId}:\`, error.message);
    // Don't throw - continue even if deletion fails
  }
}

/**
 * Update furniture item image
 */
async function updateItemImage(slug, imagePath) {
  const item = await FurnitureItem.findOne({ slug });

  if (!item) {
    console.log(\`❌ Item not found: \${slug}\`);
    return false;
  }

  console.log(\`\\n📦 Updating Item: \${item.name} (\${slug})\`);

  // Get old image info
  const oldImage = item.images[IMAGE_INDEX_TO_REPLACE];
  const oldPublicId = oldImage?.publicId;

  // Upload new image
  const folder = CLOUDINARY_FOLDERS.items;
  const publicId = slug; // Use slug as public ID
  const newImage = await uploadToCloudinary(imagePath, folder, publicId);

  // Delete old image if it exists and is different
  if (oldPublicId && oldPublicId !== newImage.publicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  // Update database
  if (item.images[IMAGE_INDEX_TO_REPLACE]) {
    item.images[IMAGE_INDEX_TO_REPLACE] = newImage;
  } else {
    item.images.push(newImage);
  }

  await item.save();
  console.log(\`✅ Item updated successfully\`);
  return true;
}

/**
 * Update furniture set image
 */
async function updateSetImage(slug, imagePath) {
  const set = await FurnitureSet.findOne({ slug });

  if (!set) {
    console.log(\`❌ Set not found: \${slug}\`);
    return false;
  }

  console.log(\`\\n📦 Updating Set: \${set.name} (\${slug})\`);

  // Get old image info
  const oldImage = set.images[IMAGE_INDEX_TO_REPLACE];
  const oldPublicId = oldImage?.publicId;

  // Upload new image
  const folder = CLOUDINARY_FOLDERS.sets;
  const publicId = slug; // Use slug as public ID
  const newImage = await uploadToCloudinary(imagePath, folder, publicId);

  // Delete old image if it exists and is different
  if (oldPublicId && oldPublicId !== newImage.publicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  // Update database
  if (set.images[IMAGE_INDEX_TO_REPLACE]) {
    set.images[IMAGE_INDEX_TO_REPLACE] = newImage;
  } else {
    set.images.push(newImage);
  }

  await set.save();
  console.log(\`✅ Set updated successfully\`);
  return true;
}

/**
 * Update room image
 */
async function updateRoomImage(slug, imagePath) {
  const room = await Room.findOne({ slug });

  if (!room) {
    console.log(\`❌ Room not found: \${slug}\`);
    return false;
  }

  console.log(\`\\n📦 Updating Room: \${room.name} (\${slug})\`);

  // Get old image info
  const oldImage = room.images[IMAGE_INDEX_TO_REPLACE];
  const oldPublicId = oldImage?.publicId;

  // Upload new image
  const folder = CLOUDINARY_FOLDERS.rooms;
  const publicId = slug; // Use slug as public ID
  const newImage = await uploadToCloudinary(imagePath, folder, publicId);

  // Delete old image if it exists and is different
  if (oldPublicId && oldPublicId !== newImage.publicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  // Update database
  if (room.images[IMAGE_INDEX_TO_REPLACE]) {
    room.images[IMAGE_INDEX_TO_REPLACE] = newImage;
  } else {
    room.images.push(newImage);
  }

  await room.save();
  console.log(\`✅ Room updated successfully\`);
  return true;
}

/**
 * Determine entity type and update accordingly
 */
async function updateImage(slug, imagePath) {
  // Resolve image path
  const resolvedPath = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(process.cwd(), imagePath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    console.log(\`❌ Image file not found: \${resolvedPath}\`);
    return false;
  }

  // Try to find in each collection
  let updated = false;

  // Try Item first
  const item = await FurnitureItem.findOne({ slug });
  if (item) {
    updated = await updateItemImage(slug, resolvedPath);
    return updated;
  }

  // Try Set
  const set = await FurnitureSet.findOne({ slug });
  if (set) {
    updated = await updateSetImage(slug, resolvedPath);
    return updated;
  }

  // Try Room
  const room = await Room.findOne({ slug });
  if (room) {
    updated = await updateRoomImage(slug, resolvedPath);
    return updated;
  }

  console.log(\`❌ No entity found with slug: \${slug}\`);
  return false;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("🚀 Starting image replacement script...\\n");

    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\\n");

    // Validate configuration
    if (Object.keys(IMAGES_TO_REPLACE).length === 0) {
      console.log("⚠️  No images configured for replacement.");
      console.log("📝 Edit the IMAGES_TO_REPLACE object at the top of this script.");
      return;
    }

    console.log(\`📋 Found \${Object.keys(IMAGES_TO_REPLACE).length} image(s) to replace\\n\`);

    // Process each image
    let successCount = 0;
    let failCount = 0;

    for (const [slug, imagePath] of Object.entries(IMAGES_TO_REPLACE)) {
      try {
        const success = await updateImage(slug, imagePath);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(\`❌ Error processing \${slug}:\`, error.message);
        failCount++;
      }
    }

    // Summary
    console.log("\\n" + "=".repeat(50));
    console.log("📊 SUMMARY");
    console.log("=".repeat(50));
    console.log(\`✅ Successfully updated: \${successCount}\`);
    console.log(\`❌ Failed: \${failCount}\`);
    console.log(\`📝 Total: \${successCount + failCount}\`);
    console.log("=".repeat(50) + "\\n");

  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the script
main();
```

## How to Use

### 1. Edit the Configuration

At the top of the script, edit the `IMAGES_TO_REPLACE` object:

```javascript
const IMAGES_TO_REPLACE = {
  "traditional-sofa": "./public/images/new-sofa.jpg",
  "modern-table": "./public/images/better-table.png",
  "royal-bedroom-set": "./public/images/bedroom-hq.jpg",
};
```

- **Key**: The slug of the item/set/room
- **Value**: Path to the new image file (relative or absolute)

### 2. Run the Script

```bash
node scripts/UploadSomePics.js
```

### 3. What It Does

For each slug:
1. ✅ Finds the entity (Item, Set, or Room) in the database
2. ✅ Uploads the new image to Cloudinary
3. ✅ Deletes the old image from Cloudinary
4. ✅ Updates the database with new URL and public ID
5. ✅ Shows progress and summary

## Configuration Options

### Change Which Image to Replace

```javascript
const IMAGE_INDEX_TO_REPLACE = 0; // 0 = first image, 1 = second, etc.
```

### Cloudinary Folders

The script uses these folders (matches your existing structure):
- Items: `pawana-furniture/items`
- Sets: `pawana-furniture/sets`
- Rooms: `pawana-furniture/rooms`

## Example Output

```
🚀 Starting image replacement script...

📡 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Found 3 image(s) to replace

📦 Updating Item: Traditional Sofa (traditional-sofa)
📤 Uploading ./public/images/new-sofa.jpg to Cloudinary...
✅ Uploaded successfully: https://res.cloudinary.com/...
🗑️  Deleting old image: pawana-furniture/items/traditional-sofa
✅ Deleted successfully
✅ Item updated successfully

==================================================
📊 SUMMARY
==================================================
✅ Successfully updated: 3
❌ Failed: 0
📝 Total: 3
==================================================

👋 Disconnected from MongoDB
```

## Features

- ✅ **Auto-detection**: Automatically detects if slug is an Item, Set, or Room
- ✅ **Safe deletion**: Only deletes old image if upload succeeds
- ✅ **Overwrite protection**: Uses Cloudinary's overwrite feature
- ✅ **Error handling**: Continues even if one image fails
- ✅ **Progress tracking**: Shows detailed progress for each image
- ✅ **Summary report**: Shows success/fail counts at the end

## Notes

- The slug is used as the Cloudinary public ID
- Images are uploaded to the appropriate folder based on entity type
- Old images are automatically deleted from Cloudinary
- Database is updated with new URL and public ID
- Script validates that image files exist before uploading
