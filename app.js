import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import expressEjsLayouts from "express-ejs-layouts";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import homeRoute from "./src/routes/home.js";
import itemRoute from "./src/routes/item.js";
import setRoute from "./src/routes/set.js";
import roomRoute from "./src/routes/room.js";
import catalogueRoute from "./src/routes/catalogue.js";
import aboutRoute from "./src/routes/about.js";
import servicesRoute from "./src/routes/services.js";
import contactRoute from "./src/routes/contact.js";
import searchRoute from "./src/routes/search.js";
import wishlistRoute from "./src/routes/wishlist.js";
import adminRoute from "./src/routes/admin.js";
import { navDataMiddleware } from "./src/middleware/navData.js";
import { sessionMiddleware } from "./src/middleware/adminAuth.js";

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const __dirname = path.resolve();
const port = process.env.PORT;

// Security middleware - sets various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.cloudinary.com", "https://maps.google.com", "https://*.googleapis.com", "https://*.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'self'", "https://maps.google.com", "https://*.google.com"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware - gzip responses for faster transfer
app.use(compression());

// Rate limiting for API routes - prevents abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", apiLimiter);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.use(expressEjsLayouts);
// Tell the layout engine where to find the master layout file
app.set('layout', 'layout');

// Static files with caching (1 year for production)
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: 0
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware for admin authentication
app.use(sessionMiddleware);

// Navigation data middleware - makes items, sets, and rooms available to all views
app.use(navDataMiddleware);

app.use("/", homeRoute);
app.use("/item", itemRoute);
app.use("/set", setRoute);
app.use("/room", roomRoute);
app.use("/catalogue", catalogueRoute);
app.use("/about", aboutRoute);
app.use("/services", servicesRoute);
app.use("/contact", contactRoute);
app.use("/api/search", searchRoute);
app.use("/wishlist", wishlistRoute);

// Admin route - mounted at the secret path from .env
const adminRoutePath = process.env.ADMIN_ROUTE || 'admin';
app.use(`/${adminRoutePath}`, adminRoute);

mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen( port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
