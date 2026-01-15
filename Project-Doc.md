# Pawana Furniture - Project Documentation

A comprehensive furniture e-commerce platform built with Node.js, Express, EJS, MongoDB, and Redis.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Environment Variables](#environment-variables)
6. [Database Models](#database-models)
7. [Utility Scripts](#utility-scripts)
8. [Admin Panel](#admin-panel)
9. [Deployment](#deployment)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

Pawana Furniture is a full-featured e-commerce website for a furniture business. Key features include:

- **Product Catalog**: Browse furniture items and sets organized by rooms (Living Room, Dining Room, Bedroom, Office, Showpieces)
- **Search**: Real-time search functionality across all products
- **Wishlist**: Save favorite items (cookie-based, no login required)
- **WhatsApp Enquiry**: Direct redirect to WhatsApp for product inquiries
- **Contact Forms**: FormSubmit integration for handling form submissions
- **Admin Panel**: Complete content management system
- **SEO Optimized**: Sitemap, meta tags, structured URLs, and Open Graph
- **Performance**: Redis caching for fast page loads
- **Responsive Design**: Works on all devices

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express 5** | Web framework |
| **EJS** | Templating engine |
| **MongoDB** | Database (via MongoDB Atlas) |
| **Mongoose** | MongoDB ODM |
| **Redis/Valkey** | Caching (via Aiven) |
| **Cloudinary** | Image hosting & CDN |
| **FormSubmit** | Free email service for contact forms |
| **Helmet** | Security headers |
| **Cloudflare Workers** | Cron job to keep Render server active |

### Keep-Alive (Preventing Render Sleep)

Render's free tier spins down after 15 minutes of inactivity, causing slow cold starts. To prevent this:

- **Cloudflare Workers** is used to ping the site every 14 minutes
- This keeps the server warm and responsive 24/7
- Setup: Create a Cloudflare Worker with a cron trigger that makes a simple GET request to the site URL

```javascript
// Cloudflare Worker cron example
export default {
  async scheduled(event, env, ctx) {
    await fetch('https://pawanafurniture.com');
  }
};

// wrangler.toml trigger:
// [triggers]
// crons = ["*/14 * * * *"]
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm (comes with Node.js)
- MongoDB Atlas account (for database)
- Cloudinary account (for images)
- Redis/Valkey instance (for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pawana-furniture
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables))

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Access the site**
   - Website: `http://localhost:3001`
   - Admin: `http://localhost:3001/<ADMIN_ROUTE>`

---

## Project Structure

```
pawana-furniture/
├── app.js                 # Main application entry point
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not in repo)
│
├── public/                # Static files
│   ├── css/               # Stylesheets (including bundle.css)
│   ├── js/                # Client-side JavaScript
│   └── images/            # Static images
│
├── scripts/               # Utility scripts (see Scripts section)
│
└── src/
    ├── middleware/
    │   └── navData.js     # Navigation data middleware
    │
    ├── models/            # Mongoose schemas
    │   ├── FurnitureItem.js
    │   ├── FurnitureSet.js
    │   ├── Room.js
    │   └── SiteSettings.js
    │
    ├── routes/            # Express routes
    │   ├── home.js        # Homepage
    │   ├── admin.js       # Admin panel (protected)
    │   ├── catalogue.js   # Product listing
    │   ├── room.js        # Room-based browsing
    │   ├── item.js        # Individual item pages
    │   ├── set.js         # Set detail pages
    │   ├── search.js      # Search API
    │   └── contact.js     # Contact page & forms
    │
    ├── utils/
    │   └── cache.js       # Redis caching utilities
    │
    └── views/             # EJS templates
        ├── layout.ejs     # Main layout wrapper
        └── pages/         # Individual pages
```

---

## Environment Variables

Create a `.env` file with the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |

| `PORT` | Server port | `3001` |

| `REDIS_URL` | Redis/Valkey connection URL | `rediss://...` |

| `CLOUDINARY_URL` | Cloudinary connection URL | `cloudinary://api_key:api_secret@cloud_name` |

| `ADMIN_ROUTE` | Secret path for admin panel | `admin-secret-path` |

| `ADMIN_ID` | Admin login username | `your_admin_id` |

| `ADMIN_PASSWORD` | Admin login password | `your_secure_password` |


### Getting New Credentials

- **MongoDB Atlas**: [cloud.mongodb.com](https://cloud.mongodb.com) → Create cluster → Get connection string
- **Cloudinary**: [cloudinary.com](https://cloudinary.com) → Dashboard → Copy CLOUDINARY_URL
- **Aiven (Redis)**: [console.aiven.io](https://console.aiven.io) → Create Valkey service → Get connection URL

---

## Database Models

### FurnitureItem

Individual furniture pieces (chairs, tables, sofas, etc.)

| Field | Type | Description |
|-------|------|-------------|
| `room` | String (enum) | Living Room, Dining Room, Bedroom, Office, or Showpieces |
| `type` | String | Furniture type (Chair, Sofa, Table, Cabinet, etc.) |
| `style` | String (enum) | Royal, Modern, or Traditional |
| `name` | String | Product name |
| `code` | String (unique) | Product code (e.g., "LR-001") |
| `slug` | String (auto) | URL-friendly slug (auto-generated from name) |
| `images` | Array | Array of `{url, publicId}` objects from Cloudinary |
| `description` | String | Product description |
| `price` | Number | Price (optional) |
| `createdAt` | Date | Creation timestamp |

### FurnitureSet

Collections/sets of furniture (sofa sets, dining sets, bedroom sets, etc.)

| Field | Type | Description |
|-------|------|-------------|
| `room` | String (enum) | Living Room, Dining Room, Bedroom, Office, or Showpieces |
| `style` | String (enum) | Royal, Modern, or Traditional |
| `name` | String | Set name |
| `code` | String (unique) | Set code (e.g., "LR-01") |
| `slug` | String (auto) | URL-friendly slug (auto-generated from name) |
| `items` | Array | References to FurnitureItem documents |
| `images` | Array | Array of `{url, publicId}` objects from Cloudinary |
| `description` | String | Set description |

### Room

Room categories for organizing furniture

| Field | Type | Description |
|-------|------|-------------|
| `name` | String (enum) | Living Room, Dining Room, Bedroom, Office, or Showpieces |
| `slug` | String (auto) | URL-friendly slug |
| `images` | Array | Room cover images |
| `featuredCode` | String | Code of featured item/set for room display |
| `description` | String | Room description |
| `hasIndividualItems` | Boolean | Whether room has individual items (true) or only sets (false) |

### SiteSettings

Global site configuration (singleton document). Major sections:

| Section | Contains |
|---------|----------|
| `home` | Hero tagline, badges, stats, hero images, featured codes, browse by room codes, delivery info, footer taglines, section titles |
| `contact` | Phone numbers, email, WhatsApp number, address lines, business hours, social media links, FAQ, form settings |
| `about` | Page title, story content, values, process steps, heritage info, CTA |
| `services` | Page title, intro, service items with features and images |
| `catalogue` | Page title and description |
| `seo` | Site URL, site name, default description, keywords, OG image, organization info |

---

## Utility Scripts

Located in the `scripts/` folder. Run with `node scripts/<script-name>.js`:

| Script | Purpose |
|--------|---------|
| `buildCSS.js` | Combines all CSS files from `main.css` imports into a single minified `bundle.css`. Run before production deployment. |
| `seedAllData.js` | Seeds the database with all furniture items, sets, and rooms. Configure which rooms to seed via the CONFIG object at the top of the file. |
| `seedSettings.js` | Seeds/resets the SiteSettings document with default values. |
| `uploadAllImages.js` | Bulk uploads images from local folders to Cloudinary and updates database records. |
| `uploadHeroImage.js` | Uploads hero images specifically. |
| `updateDocument.js` | Utility for updating specific document fields. |
| `updateImage.js` | Updates image codes for specific items/sets. |
| `batchUpdateImages.js` | Batch process for updating multiple image records. |
| `analyzeImageCodes.js` | Analyzes and validates image codes in the database. |
| `addDocuments.js` | Adds new documents to collections. |
| `renameToCodeOnly.js` | Utility for renaming image references to code-only format. |
| `updateFormEmail.js` | Updates the form email in SiteSettings. |

---

## Admin Panel

### Accessing Admin

1. Navigate to: `https://yoursite.com/<ADMIN_ROUTE>`
2. Login with `ADMIN_ID` and `ADMIN_PASSWORD`

### Admin Features

- **Dashboard**: Overview with counts of items, sets, rooms
- **Furniture Items**: Add, edit, delete individual furniture pieces
- **Furniture Sets**: Manage furniture collections
- **Rooms**: Configure room settings and featured images
- **Site Settings**: Update all site content including:
  - Contact information (phones, email, address)
  - Homepage sections (hero, featured items, delivery)
  - About page content
  - Services page content
  - SEO settings

### Changing Admin Credentials

Update in `.env` file and restart server:
```
ADMIN_ROUTE=your-new-secret-path
ADMIN_ID=your-new-username
ADMIN_PASSWORD=your-new-password
```

---

## Deployment

### Current Hosting: Render

The site is deployed on [Render](https://render.com).

### To Deploy Updates

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```

2. **Automatic Deployment**
   - Render is connected to the GitHub repo
   - Pushes to `main` branch trigger automatic deployments

### Environment Variables on Render

1. Go to Render Dashboard → Your Service → Environment
2. Add/update environment variables
3. Service will auto-restart

### Build & Start Commands
- **Build**: `npm install`
- **Start**: `npm start` (this runs `buildCSS.js` then starts the server)

---

## Common Tasks

### Adding a New Furniture Item

**Via Admin Panel:**
1. Login to Admin Panel
2. Navigate to "Items" section
3. Click "Add New"
4. Fill in: Name, Room, Type, Style, Code, Description
5. Add image codes from Cloudinary
6. Save

**Via Code/Script:**
```javascript
// In scripts/addDocuments.js or similar
import FurnitureItem from "../src/models/FurnitureItem.js";

const newItem = new FurnitureItem({
  room: "Living Room",
  type: "Chair",
  style: "Royal",
  name: "Your Item Name",
  code: "LR-XXX", // Unique code
  description: "Description here",
  images: [] // Add after uploading to Cloudinary
});
await newItem.save();
```

### Managing Images

Images are hosted on Cloudinary. The workflow:

1. **Upload to Cloudinary**: Upload image via Cloudinary dashboard or API
2. **Get the URL**: Copy the full Cloudinary URL
3. **Update in Admin**: Paste URL in the admin panel image field
4. Images are stored as `{url, publicId}` objects

### Updating Contact Information

1. Admin Panel → Settings → Contact
2. Update: Phone numbers, email, WhatsApp number, address
3. Save changes
4. Changes reflect immediately (cache will update)

### WhatsApp Enquiry Feature

The site uses WhatsApp redirect for product inquiries:
- Configured in SiteSettings: `contact.whatsappEnquiry` (number without + or spaces)
- Product pages have "Enquire on WhatsApp" button
- Redirects to: `https://wa.me/<whatsappNumber>?text=<pre-filled message>`

### Contact Form Emails

Forms use **FormSubmit** (free service):
- Configured in SiteSettings: `contact.formEmail`
- Forms POST directly to `https://formsubmit.co/<email>`
- No server-side email handling required

---

## Troubleshooting

### Site Not Loading

1. Check if server is running: `npm run dev`
2. Look for MongoDB connection message in console
3. Verify all environment variables are set correctly

### Images Not Showing

1. Check Cloudinary URL is correct in `.env`
2. Verify image exists in Cloudinary dashboard
3. Check browser console for CSP errors

### Admin Login Fails

1. Verify `ADMIN_ID` and `ADMIN_PASSWORD` in `.env`
2. Clear browser cookies for the site
3. Restart server after changing credentials

### Slow Performance

1. Check Redis connection in startup logs
2. If Redis is down, site works but slower
3. Restart server to rebuild cache

### Database Connection Errors

1. Verify `DB_URI` in `.env`
2. Check MongoDB Atlas → Network Access → IP Whitelist (add `0.0.0.0/0` for all IPs)
3. Free tier clusters pause after 7 days of inactivity — login to Atlas to resume

### FormSubmit Not Working

1. Verify `formEmail` in Site Settings matches the FormSubmit-activated email
2. Check that email has been verified with FormSubmit
3. First submission from a new email requires activation click

---

## Support

For technical issues:
- Check this documentation first
- Review code comments throughout the project
- Consult the GitHub repository commit history

---

*Last Updated: January 2026*
