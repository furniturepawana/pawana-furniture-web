/**
 * Upload Hero Image Script
 *
 * Uploads the hero image to Cloudinary with eager transformations
 * for responsive delivery (desktop, tablet, mobile).
 *
 * Usage: node scripts/uploadHeroImage.js
 *
 * After running, copy the output URLs to your CSS file.
 */

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Configure Cloudinary
// Cloudinary auto-configured via CLOUDINARY_URL environment variable

// ==========================================
// CONFIGURATION - Change image filename here
// ==========================================

const HERO_IMAGE_FILENAME = "site-hero.webp";  // Change this to swap the hero image
const PUBLIC_ID = "pawana_hero";               // Cloudinary public ID

// ==========================================

const imagePath = path.join(__dirname, "../public/images", HERO_IMAGE_FILENAME);

async function uploadHeroImage() {
  console.log("🚀 Hero Image Upload Script\n");

  // Check if image exists
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image not found: ${imagePath}`);
    console.log(`   Make sure "${HERO_IMAGE_FILENAME}" is in public/images/`);
    process.exit(1);
  }

  console.log(`📁 Image: ${HERO_IMAGE_FILENAME}`);
  console.log(`📤 Uploading to Cloudinary...\n`);

  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      public_id: PUBLIC_ID,
      folder: "pawana/hero",
      overwrite: true,
      resource_type: "image",
      // Eager transformations for responsive images
      eager: [
        // Desktop: 1920px, 16:9, high quality
        { width: 1920, height: 1080, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" },
        // Tablet: 1200px, 16:9
        { width: 1200, height: 675, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" },
        // Mobile: 800px, 4:5 (taller for mobile view)
        { width: 800, height: 1000, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" },
      ],
      eager_async: false,  // Wait for transformations to complete
    });

    console.log("✅ Upload successful!\n");
    console.log("=" .repeat(60));
    console.log("📋 Generated URLs:\n");

    // Base URL
    const baseUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload`;
    const publicPath = `${result.public_id}`;

    // Generate transformation URLs
    const desktopUrl = `${baseUrl}/w_1920,ar_16:9,c_fill,g_auto,f_auto,q_auto/${publicPath}`;
    const tabletUrl = `${baseUrl}/w_1200,ar_16:9,c_fill,g_auto,f_auto,q_auto/${publicPath}`;
    const mobileUrl = `${baseUrl}/w_800,ar_4:5,c_fill,g_auto:subject,f_auto,q_auto/${publicPath}`;

    console.log("🖥️  DESKTOP (1920px, 16:9):");
    console.log(`   ${desktopUrl}\n`);

    console.log("📱 TABLET (1200px, 16:9):");
    console.log(`   ${tabletUrl}\n`);

    console.log("📱 MOBILE (800px, 4:5):");
    console.log(`   ${mobileUrl}\n`);

    console.log("=" .repeat(60));
    console.log("\n📝 CSS Code to use:\n");

    // Output CSS code for easy copy-paste
    const cssCode = `/* Hero Section - Responsive Background */
.hero {
  /* Mobile first (default) */
  background: url("${mobileUrl}") center center / cover no-repeat;
}

/* Tablet and up */
@media (min-width: 768px) {
  .hero {
    background: url("${tabletUrl}") center center / cover no-repeat;
  }
}

/* Desktop */
@media (min-width: 1200px) {
  .hero {
    background: url("${desktopUrl}") center center / cover no-repeat;
  }
}`;

    console.log(cssCode);
    console.log("\n" + "=" .repeat(60));

    // Also output the direct URL for reference
    console.log("\n📌 Original upload URL:");
    console.log(`   ${result.secure_url}\n`);

    console.log("✨ Done! Copy the CSS above to your _home.css file.");

  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    if (error.http_code) {
      console.error(`   HTTP Code: ${error.http_code}`);
    }
    process.exit(1);
  }
}

uploadHeroImage();
