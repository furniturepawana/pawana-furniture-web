import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import FurnitureItem from "../src/models/FurnitureItem.js";
import FurnitureSet from "../src/models/FurnitureSet.js";
import Room from "../src/models/Room.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URL = process.env.DB_URI;

// ==========================================
// CONFIGURATION - Edit these to control seeding
// ==========================================
const CONFIG = {
  rooms: {
    livingRoom: false,     // Set to false to skip
    diningRoom: true,     // Enable when data is ready
    bedroom: true,        // Enable when data is ready
    office: true,         // Enable when data is ready
    showpieces: true,     // Enable when data is ready
  },
  seedRoomDocuments: true, // Set to true to also seed/update Room collection
};

// ==========================================
// ROOM DATA STRUCTURES
// Each room follows the same pattern as living room
// ==========================================

const roomData = {
  // ─────────────────────────────────────────
  // LIVING ROOM
  // ─────────────────────────────────────────
  livingRoom: {
    roomName: "Living Room",
    folderName: "living-room",
    hasIndividualItems: true,
    styles: {
      royal: {
        styleCode: "LR",
        styleName: "Royal",
        sets: [
          { code: "LR-01", name: "Classic Leather Loveseat" },
          { code: "LR-02", name: "Light Tufted Chesterfield" },
          { code: "LR-03", name: "Minimalist Floating Sofa" },
          { code: "LR-04", name: "Regal Gold Carved" },
          { code: "LR-05", name: "Sleek Gray Sectional" },
          { code: "LR-06", name: "Tufted Chaise Lounge" },
          { code: "LR-07", name: "Velvet Button Settee" },
        ],
        items: {
          Chair: [
            { code: "LR-001", name: "Baroque Gilded Throne" },
            { code: "LR-002", name: "French Floral Fauteuil" },
            { code: "LR-003", name: "Gilded Velvet Cabriole" },
            { code: "LR-004", name: "Ornate Gold Damask" },
            { code: "LR-005", name: "Rococo Cane Chair" },
          ],
          Sofa: [
            { code: "LR-006", name: "Baroque Leather Chesterfield" },
            { code: "LR-007", name: "Bold Patina Armchair" },
            { code: "LR-008", name: "Classic Cognac Tufted" },
            { code: "LR-009", name: "Distressed Club Sofa" },
            { code: "LR-010", name: "Gilded Neoclassic Settee" },
            { code: "LR-011", name: "Ornate Damask Traditional" },
            { code: "LR-012", name: "Regal Black Velvet" },
            { code: "LR-013", name: "Tufted Empire Lounge" },
          ],
          Table: [
            { code: "LR-014", name: "Carved Marble Glass" },
            { code: "LR-015", name: "Emerald Baroque Console" },
            { code: "LR-016", name: "Grand Marble Console" },
            { code: "LR-017", name: "Imperial Gold Cabriole" },
            { code: "LR-018", name: "Marquetry Rococo Square" },
            { code: "LR-019", name: "Ornate Pedestal Entry" },
            { code: "LR-020", name: "Square Gilded Mirror" },
          ],
        },
      },
      traditional: {
        styleCode: "LT",
        styleName: "Traditional",
        sets: [
          { code: "LT-01", name: "Burgundy Tufted Settee" },
          { code: "LT-02", name: "Classic Linen Roll" },
          { code: "LT-03", name: "Formal Scroll Arm" },
          { code: "LT-04", name: "Sleek Chaise Lounge" },
        ],
        items: {
          Chair: [
            { code: "LT-001", name: "Aged Leather Club" },
            { code: "LT-002", name: "Baroque Gold Accent" },
            { code: "LT-003", name: "Classic Cognac Tufted1" },
            { code: "LT-004", name: "Classic Roll Arm" },
            { code: "LT-005", name: "French Cane Bergère" },
            { code: "LT-006", name: "Louis Oval Back" },
            { code: "LT-007", name: "Rococo Rose Tapestry" },
            { code: "LT-008", name: "Sleek Velvet Transitional" },
            { code: "LT-009", name: "Tropical Woven Accent" },
            { code: "LT-010", name: "Victorian Shell Back" },
          ],
          Sofa: [
            { code: "LT-011", name: "Contemporary Panel Sofa" },
            { code: "LT-012", name: "Grand Formal Scroll" },
            { code: "LT-013", name: "Modern Cigar Chesterfield" },
            { code: "LT-014", name: "Neoclassic Tufted Trim" },
            { code: "LT-015", name: "Sleek Gray Modular" },
            { code: "LT-016", name: "Traditional Carved Frame" },
          ],
          Table: [
            { code: "LT-017", name: "Clean White Modular" },
            { code: "LT-018", name: "Geometric Gold Glass" },
            { code: "LT-019", name: "Industrial Metal Grid" },
            { code: "LT-020", name: "Leather Inset Walnut" },
            { code: "LT-021", name: "Marble Drum Accent" },
            { code: "LT-022", name: "Modern Oval Leg" },
            { code: "LT-023", name: "Rococo Gilded Glass" },
            { code: "LT-024", name: "Vintage Storage Rectangle" },
          ],
        },
      },
      modern: {
        styleCode: "LM",
        styleName: "Modern",
        sets: [
          { code: "LM-01", name: "Crimson Accent Sofa" },
          { code: "LM-02", name: "Mid-Century Forest Sofa" },
          { code: "LM-03", name: "Velvet Modern Transitional" },
        ],
        items: {
          Chair: [
            { code: "LM-001", name: "Classic Carved Arm" },
            { code: "LM-002", name: "Elegant Tall Back" },
            { code: "LM-003", name: "Formal Estate Chair" },
            { code: "LM-004", name: "Leather Nailhead Club" },
            { code: "LM-005", name: "Modern Cognac Frame" },
            { code: "LM-006", name: "Natural Wood Lounge" },
          ],
          Sofa: [
            { code: "LM-007", name: "Classic Tufted Settee" },
            { code: "LM-008", name: "Cozy Velvet Lounge" },
            { code: "LM-009", name: "Glamorous Tufted Sofa" },
            { code: "LM-010", name: "Modern Panel Sofa" },
            { code: "LM-011", name: "Regal Tufted Chesterfield" },
          ],
          Table: [
            { code: "LM-012", name: "Curved Open Shelf" },
            { code: "LM-013", name: "Elevated Open Storage" },
            { code: "LM-014", name: "Floating Modern Walnut" },
            { code: "LM-015", name: "Geometric Inlay Storage" },
            { code: "LM-016", name: "Industrial Metal Leg" },
            { code: "LM-017", name: "Nordic Storage Rectangle" },
            { code: "LM-018", name: "Rounded Base Cabinet" },
            { code: "LM-019", name: "Squared Drawer Design" },
          ],
        },
      },
    },
  },

  // ─────────────────────────────────────────
  // DINING ROOM - Sets only
  // ─────────────────────────────────────────
  diningRoom: {
    roomName: "Dining Room",
    folderName: "dining-room",
    hasIndividualItems: false,
    styles: {
      modern: {
        styleCode: "DM",
        styleName: "Modern",
        sets: [
          { code: "DM-01", name: "A Statement Chandelier Dining" },
          { code: "DM-02", name: "Classy Royal Dining Set" },
          { code: "DM-03", name: "Cream Finish Dining" },
          { code: "DM-04", name: "Dak Wood Dining Set" },
          { code: "DM-05", name: "Dark Wood Creamed Dining" },
          { code: "DM-06", name: "Luxury Dining Room" },
          { code: "DM-07", name: "Small Space Formal Dining Room" },
          { code: "DM-08", name: "Stylish Haven Dining" },
          { code: "DM-09", name: "Treemium Dining Set" },
          { code: "DM-10", name: "Warm Class Dining" },
        ],
      },
      royal: {
        styleCode: "DR",
        styleName: "Royal",
        sets: [
          { code: "DR-01", name: "Grand Crystal Chandelier Dining" },
          { code: "DR-02", name: "Tufted Storage Master Suite" },
          { code: "DR-03", name: "Carved Finial Traditional Suite" },
          { code: "DR-04", name: "The Gilded Empress Dining Hall" },
          { code: "DR-05", name: "The Bronze Tapestry Dining Salon" },
          { code: "DR-06", name: "The Gilded Empress Dining Hall II" },
          { code: "DR-07", name: "The Legacy Estate Dining" },
          { code: "DR-08", name: "The Cane Court Salon" },
          { code: "DR-09", name: "The Carved Rosette Chamber" },
          { code: "DR-10", name: "The Hearthside Supper Room" },
          { code: "DR-11", name: "The Grand Coffer Chamber" },
          { code: "DR-12", name: "The Rotunda Palace Dining" },
          { code: "DR-13", name: "The Trellis & Gold Dining" },
          { code: "DR-14", name: "The Grand Baron's Salon" },
          { code: "DR-15", name: "The Hearthside Villa Dining" },
          { code: "DR-16", name: "The Modern Palladian Room" },
          { code: "DR-17", name: "The Versailles Cane Salon" },
          { code: "DR-18", name: "The Pedestal Estate Room" },
          { code: "DR-19", name: "The Scarlet Draped Salon" },
          { code: "DR-20", name: "The Gilded Imperial Feast" },
          { code: "DR-21", name: "The Velvet Bordeaux Salon" },
          { code: "DR-22", name: "The Grand Foyer Supper" },
        ],
      },
      traditional: {
        styleCode: "DT",
        styleName: "Traditional",
        sets: [
          { code: "DT-01", name: "The Cerulean Damask Gathering" },
          { code: "DT-02", name: "The Chandelier Grandeur Banquet" },
          { code: "DT-03", name: "The Crystal Canopy Dining Suite" },
          { code: "DT-04", name: "The Embroidered Tapestry Supper" },
          { code: "DT-05", name: "The Gilded Blackwood Gala" },
          { code: "DT-06", name: "The Gilded Damask Feast" },
          { code: "DT-07", name: "The Golden Rococo Formalite" },
          { code: "DT-08", name: "The Heritage Pedestal Gathering" },
          { code: "DT-09", name: "The Mosswood Heritage Dining" },
          { code: "DT-10", name: "The Regal Venetian Panel Room" },
          { code: "DT-11", name: "The Renaissance Tapestry Hall" },
          { code: "DT-12", name: "The Serene Blue Damask Retreat" },
          { code: "DT-13", name: "The Shell-Patterned Art Deco Supper" },
          { code: "DT-14", name: "The Southern Belle's Grand Dining Room" },
          { code: "DT-15", name: "The Sunlit Versailles Gathering" },
          { code: "DT-16", name: "The Tufted Diamond Salon" },
          { code: "DT-17", name: "The Tuscan Archway Gathering" },
          { code: "DT-18", name: "The Tuscan Hillside Banquet" },
          { code: "DT-19", name: "The Victorian Tapestry Hall" },
        ],
      },
    },
  },

  // ─────────────────────────────────────────
  // BEDROOM - Sets only
  // ─────────────────────────────────────────
  bedroom: {
    roomName: "Bedroom",
    folderName: "bedroom",
    hasIndividualItems: false,
    styles: {
      modern: {
        styleCode: "BM",
        styleName: "Modern",
        sets: [
          { code: "BM-01", name: "Arch Bed Crystal Chandelier" },
          { code: "BM-02", name: "Arch Bed Dressing Room" },
          { code: "BM-03", name: "Arch Bed Nightstands Warm" },
          { code: "BM-04", name: "Charcoal Tuft Bed" },
          { code: "BM-05", name: "Chestnut Button Bed" },
          { code: "BM-06", name: "Chic Accent Bed" },
          { code: "BM-07", name: "Classic Mocha Bed" },
          { code: "BM-08", name: "Coastal Curve Bed" },
          { code: "BM-09", name: "Deep Tuft Bed" },
          { code: "BM-10", name: "Forest Wingback" },
          { code: "BM-11", name: "Gilt Retreat Set" },
          { code: "BM-12", name: "Manor Bed Bench Set" },
          { code: "BM-13", name: "Tufted Bed Chandelier Room" },
        ],
      },
      royal: {
        styleCode: "BR",
        styleName: "Royal",
        sets: [
          { code: "BR-01", name: "Carved Dark Wood Bed" },
          { code: "BR-02", name: "Carved Dark Wood Sleigh" },
          { code: "BR-03", name: "Carved Sleigh Bed Red" },
          { code: "BR-04", name: "Classic Royal Gold Bed" },
          { code: "BR-05", name: "Cozy Bed Room" },
          { code: "BR-06", name: "Dark Paneled Simple Bed" },
          { code: "BR-07", name: "Dark Sleigh Simple Bed" },
          { code: "BR-08", name: "Dark Traditional Bedroom Set" },
          { code: "BR-09", name: "Dark Wood Bedroom Set" },
          { code: "BR-10", name: "Dark Wood Ornate Bed" },
          { code: "BR-11", name: "Elegant Classic Bedroom Interior" },
          { code: "BR-12", name: "Four Poster Spindle Bed" },
          { code: "BR-13", name: "French Baroque Gold Velvet" },
          { code: "BR-14", name: "Le Design Magnifique" },
          { code: "BR-15", name: "Ornate Wood Bed Gold" },
          { code: "BR-16", name: "Ornate Wood Gold Accent" },
          { code: "BR-17", name: "Royal King Bed" },
          { code: "BR-18", name: "Platform Gold Tufted Bed" },
          { code: "BR-19", name: "Royal Cream Bed" },
          { code: "BR-20", name: "Royal Gold Black Bed" },
          { code: "BR-21", name: "Royal Gold Tufted Bedroom" },
          { code: "BR-22", name: "Royal Wood Bed" },
          { code: "BR-23", name: "Royal Wood Post Bed" },
          { code: "BR-24", name: "Royal Wood Purple Bed" },
          { code: "BR-25", name: "Tufted Bench Dark Wood" },
          { code: "BR-26", name: "Tufted Sleigh Muted Tones" },
          { code: "BR-27", name: "Tuscan-Inspired Bed" },
          { code: "BR-28", name: "Upholstered Carved Sleigh Bed" },
          { code: "BR-29", name: "Victorian Canopy Chandelier" },
          { code: "BR-30", name: "Wood Poster Bed Traditional" },
          { code: "BR-31", name: "Wooden King Size Bed Design Luxury" },
          { code: "BR-32", name: "Vintage White Luxury Suite" },
          { code: "BR-33", name: "Wood Ornate Bed" },
        ],
      },
      traditional: {
        styleCode: "BT",
        styleName: "Traditional",
        sets: [
          { code: "BT-01", name: "Arabic Class Bed" },
          { code: "BT-02", name: "Astoria Grand Fletcher Bed" },
          { code: "BT-03", name: "Brown Carved Bed" },
          { code: "BT-04", name: "Carved Classy Bed" },
          { code: "BT-05", name: "Carved Headboard Classic" },
          { code: "BT-06", name: "Classic Bedroom Decor" },
          { code: "BT-07", name: "Classic Padded White" },
          { code: "BT-08", name: "Classic Tufted Sleigh" },
          { code: "BT-09", name: "Classic Wood Upholstered" },
          { code: "BT-10", name: "Classical Tufted Retreat" },
          { code: "BT-11", name: "Classy Double Bed" },
          { code: "BT-12", name: "Detailed Curved Carved" },
          { code: "BT-13", name: "Elegant Queen Bedroom" },
          { code: "BT-14", name: "Elegant Wood Canopy" },
          { code: "BT-15", name: "Grand Gilded Throne" },
          { code: "BT-16", name: "Modern Tufted Charcoal" },
          { code: "BT-17", name: "Old Carved Classic" },
          { code: "BT-18", name: "Old Carved Sleigh" },
          { code: "BT-19", name: "Ornate Silk Canopy" },
          { code: "BT-20", name: "Panel Bright Contrast" },
          { code: "BT-21", name: "Regal Gold Trimmed" },
          { code: "BT-22", name: "Simple Tall Panel" },
          { code: "BT-23", name: "Sleigh Dark Classic" },
          { code: "BT-24", name: "Tufted Curved Carved" },
          { code: "BT-25", name: "Tufted Gray Arch" },
          { code: "BT-26", name: "Wood Simple Bed" },
          { code: "BT-27", name: "Wooden Carved Bed Design" },
        ],
      },
    },
  },

  // ─────────────────────────────────────────
  // OFFICE - Sets only
  // ─────────────────────────────────────────
  office: {
    roomName: "Office",
    folderName: "office",
    hasIndividualItems: false,
    styles: {
      modern: {
        styleCode: "OM",
        styleName: "Modern",
        sets: [
          { code: "OM-01", name: "The Gilded Damask Morning Meal" },
          { code: "OM-02", name: "The Classic Venetian Nook" },
          { code: "OM-03", name: "The Presidential Office Atelier" },
          { code: "OM-04", name: "The Gilded Formal Reception" },
          { code: "OM-05", name: "The Neoclassical Column Study" },
          { code: "OM-06", name: "The Tufted Park View Dining" },
          { code: "OM-07", name: "The Wooded Tones Garden Retreat" },
        ],
      },
      royal: {
        styleCode: "OR",
        styleName: "Royal",
        sets: [
          { code: "OR-01", name: "The Rich Mahogany Grand Study" },
          { code: "OR-02", name: "The Classic Library Grande" },
          { code: "OR-03", name: "The Dark Wood Library Study" },
          { code: "OR-04", name: "The Garden View Rustic Dining" },
          { code: "OR-05", name: "The Gilded Library Executive Suite" },
          { code: "OR-06", name: "The Golden Latticework Fete" },
          { code: "OR-07", name: "The Ornate Burlwood Library" },
          { code: "OR-08", name: "The Powder Blue Formal Dining" },
          { code: "OR-09", name: "The Tufted Garden Veranda" },
          { code: "OR-10", name: "The Tufted Glass Garden Suite" },
        ],
      },
      traditional: {
        styleCode: "OT",
        styleName: "Traditional",
        sets: [
          { code: "OT-01", name: "The Stately Leather Executive" },
          { code: "OT-02", name: "The Polished Mahogany Executive" },
          { code: "OT-03", name: "The Heritage Executive Suite" },
          { code: "OT-04", name: "The Estate Library Office" },
          { code: "OT-05", name: "The Striped Panel Director's Office" },
          { code: "OT-06", name: "The Tufted Executive Chamber" },
          { code: "OT-07", name: "The Windowed Atrium Garden Dining" },
          { code: "OT-08", name: "The Classic Cherrywood Study" },
        ],
      },
    },
  },

  // ─────────────────────────────────────────
  // SHOWPIECES - Items only (Cabinet, Console, Fireplace)
  // ─────────────────────────────────────────
  showpieces: {
    roomName: "Showpieces",
    folderName: "showpieces",
    hasIndividualItems: true,
    styles: {
      modern: {
        styleCode: "SM",
        styleName: "Modern",
        sets: [],
        items: {
          Cabinet: [
            { code: "SM-001", name: "The American Classic Five-Drawer Sideboard" },
            { code: "SM-002", name: "The American Traditional Five-Drawer Server" },
            { code: "SM-003", name: "The American Traditional Five-Drawer Server II" },
            { code: "SM-004", name: "The Classic Honey-Oak Buffet Console" },
            { code: "SM-005", name: "The Curved Arch-Door Mid-Century Console" },
            { code: "SM-006", name: "The Dark Walnut Tapered Leg Sideboard" },
            { code: "SM-007", name: "The Elegant Five-Door Entryway Buffet" },
            { code: "SM-008", name: "The Emerald Woven Heritage Dresser" },
            { code: "SM-009", name: "The Georgian Glass-Paneled Hutch Console" },
            { code: "SM-010", name: "The Grand Parisian Curved-Front Buffet" },
            { code: "SM-011", name: "The Grand Twelve-Panel Mahogany Commode" },
            { code: "SM-012", name: "The Ironwood Farmhouse Quadrant Sideboard" },
            { code: "SM-013", name: "The Modern Curved Four-Door Buffet" },
            { code: "SM-014", name: "The Obsidian Fluted Seven-Drawer Commode" },
            { code: "SM-015", name: "The Richly Paneled Display Buffet" },
          ],
          Console: [
            { code: "SM-016", name: "Antique Cabriole Leg Vanity" },
            { code: "SM-017", name: "Classic Black Foyer Table" },
            { code: "SM-018", name: "Elegant Dark Wood Console" },
            { code: "SM-019", name: "French Country Console Table" },
            { code: "SM-020", name: "French Farmhouse Foyer Console" },
            { code: "SM-021", name: "French Neoclassic Foyer Console" },
            { code: "SM-022", name: "Half-Moon Demilune Console" },
            { code: "SM-023", name: "Mahogany Curved Leg Console" },
            { code: "SM-024", name: "Ornate Foyer Accent Table" },
            { code: "SM-025", name: "Oval Marble Top Console" },
            { code: "SM-026", name: "Oval Marble Top Console II" },
            { code: "SM-027", name: "Queen Anne Curio Table" },
            { code: "SM-028", name: "Refined Curved Leg Console" },
            { code: "SM-029", name: "Semi-Oval Fluted Console" },
            { code: "SM-030", name: "Slim Demilune Entry Console" },
            { code: "SM-031", name: "Traditional Three-Drawer Console" },
            { code: "SM-032", name: "Transitional Foyer Accent Table" },
            { code: "SM-033", name: "Walnut Tapered Leg Console" },
          ],
          Fireplace: [
            { code: "SM-034", name: "The Classic Magnolia Hearth" },
            { code: "SM-035", name: "The Contemporary Wood and Marble Hearth" },
            { code: "SM-036", name: "The Cream-Mantled Riverside Hearth" },
            { code: "SM-037", name: "The Dark Wood Marble Fireplace" },
            { code: "SM-038", name: "The Modern Hearth Mantle" },
            { code: "SM-039", name: "The Oak Mantel Black Marble Fireplace" },
            { code: "SM-040", name: "The Twin Wingback Fireside" },
            { code: "SM-041", name: "The Walnut and Cream Marble Hearth" },
          ],
        },
      },
      royal: {
        styleCode: "SR",
        styleName: "Royal",
        sets: [],
        items: {
          Cabinet: [
            { code: "SR-001", name: "Art Deco Sculptural Buffet" },
            { code: "SR-002", name: "Black Empire Style Sideboard" },
            { code: "SR-003", name: "Black Venetian Style Sideboard" },
            { code: "SR-004", name: "Chic Navy Gilt Commode" },
            { code: "SR-005", name: "Curved Venetian Burl Sideboard" },
            { code: "SR-006", name: "Curved Walnut Burl Sideboard" },
            { code: "SR-007", name: "Elaborate Neoclassical Marquetry Sideboard" },
            { code: "SR-008", name: "Elegant Floral Inlaid Sideboard" },
            { code: "SR-009", name: "Elegant Marble Top Commode" },
            { code: "SR-010", name: "Floral Marquetry Serpentine Sideboard" },
            { code: "SR-011", name: "Florentine Gilt Console Mirror" },
            { code: "SR-012", name: "Gilded Serpentine Inlaid Buffet" },
            { code: "SR-013", name: "Gilded Serpentine Inlaid Buffet II" },
            { code: "SR-014", name: "Gilt and Floral Commode" },
            { code: "SR-015", name: "Inlaid Bowfront Gilt Sideboard" },
            { code: "SR-016", name: "Inlaid Serpentine Gilt Sideboard" },
            { code: "SR-017", name: "Louis XV Serpentine Commode" },
            { code: "SR-018", name: "Louis XVI Commode Serpentine" },
            { code: "SR-019", name: "Luxurious Inlaid Serpentine Buffet" },
            { code: "SR-020", name: "Mahogany and Gilt Buffet" },
            { code: "SR-021", name: "Majestic Donatello Sideboard Mirror" },
            { code: "SR-022", name: "Marquetry Serpentine Commode" },
            { code: "SR-023", name: "Opulent Marquetry Serpentine Buffet" },
            { code: "SR-024", name: "Opulent Marquetry Serpentine Buffet II" },
            { code: "SR-025", name: "Ornate Burlwood Commode Cabinet" },
            { code: "SR-026", name: "Ornate Marquetry Curvaceous Buffet" },
            { code: "SR-027", name: "Ornate Marquetry Curvaceous Sideboard" },
            { code: "SR-028", name: "Ornate Mirror-Paneled Black Sideboard" },
            { code: "SR-029", name: "Regal Burl Marquetry Sideboard" },
            { code: "SR-030", name: "Regal Burlwood Gilt Buffet" },
            { code: "SR-031", name: "Regal Burlwood Inlaid Buffet" },
            { code: "SR-032", name: "Regal Gilded Burl Commode" },
            { code: "SR-033", name: "Regal Marbled Gilt Commode" },
            { code: "SR-034", name: "Regal Marbled Gilt Commode II" },
            { code: "SR-035", name: "Regal Marquetry Commode Mirror" },
            { code: "SR-036", name: "Rococo Gilded Console Mirror" },
            { code: "SR-037", name: "Royal Burlwood Inlaid Buffet" },
            { code: "SR-038", name: "Serpentine Burlwood Commode Chest" },
            { code: "SR-039", name: "Serpentine Gilt Console Table" },
            { code: "SR-040", name: "The Baroque Black Dresser Console" },
            { code: "SR-041", name: "The Classic Glass-Door Sideboard" },
            { code: "SR-042", name: "The Classic Inlaid Florentine Buffet" },
            { code: "SR-043", name: "The Dark Wood Lowboy" },
            { code: "SR-044", name: "The Elegant Dark-Wood Server" },
            { code: "SR-045", name: "The Elegant Paneled-Door Sideboard" },
            { code: "SR-046", name: "The French Baroque Bombe Commode" },
            { code: "SR-047", name: "The Grand Neoclassical Sideboard" },
            { code: "SR-048", name: "The Louis XV Gilt Commode" },
            { code: "SR-049", name: "The Louis XVI Marquetry Commode" },
            { code: "SR-050", name: "The Rococo Gilt-Bronze Commode" },
          ],
          Console: [
            { code: "SR-051", name: "Baroque Entry Console" },
            { code: "SR-052", name: "Carved Gilt Mirror Console" },
            { code: "SR-053", name: "Dark Wood Baroque" },
            { code: "SR-054", name: "Dark Wood Baroque II" },
            { code: "SR-055", name: "Dark Wood Grandeur Console" },
            { code: "SR-056", name: "Dark Wood Grandeur" },
            { code: "SR-057", name: "Florentine Carved Console" },
            { code: "SR-058", name: "French Baroque Entry" },
            { code: "SR-059", name: "Gilded Baroque Splendor" },
            { code: "SR-060", name: "Gilded Florentine Console" },
            { code: "SR-061", name: "Gilded Mirror Console" },
            { code: "SR-062", name: "Gilded Ornate Console" },
            { code: "SR-063", name: "Gilded Regency Entry" },
            { code: "SR-064", name: "Gold Baroque Entry" },
            { code: "SR-065", name: "Marble Top Baroque" },
            { code: "SR-066", name: "Ornate Carved Entry" },
            { code: "SR-067", name: "Ornate Entry Console" },
            { code: "SR-068", name: "Ornate Gilded Grandeur" },
            { code: "SR-069", name: "Ornate Gold Foyer" },
            { code: "SR-070", name: "Ornate Ivory Heritage" },
            { code: "SR-071", name: "Regal Baroque Hall Console" },
            { code: "SR-072", name: "Regal Entry Console" },
            { code: "SR-073", name: "Regal Gilded Console" },
            { code: "SR-074", name: "Regal Mahogany Grandeur" },
            { code: "SR-075", name: "Rococo Carved Hall Console" },
            { code: "SR-076", name: "Royal Marble Tableau" },
            { code: "SR-077", name: "Silver Baroque Grandeur" },
            { code: "SR-078", name: "Sunset Gilded Console" },
            { code: "SR-079", name: "Victorian Walnut Display" },
            { code: "SR-080", name: "White Gilded Rococo" },
            { code: "SR-081", name: "White Rococo Splendor" },
          ],
          Fireplace: [
            { code: "SR-082", name: "The Black Cherrywood Fluted Hearth" },
            { code: "SR-083", name: "The Black Cherrywood Fluted Hearth II" },
            { code: "SR-084", name: "The Carved Renaissance Mantel" },
            { code: "SR-085", name: "The Classic Colonial Mantel" },
            { code: "SR-086", name: "The Contemporary Dark Wood Hearth" },
            { code: "SR-087", name: "The Cream Georgian Fluted Hearth" },
            { code: "SR-088", name: "The Dark Walnut Romanesque Arch Mantel" },
            { code: "SR-089", name: "The Dark Walnut Romanesque Arch Mantel II" },
            { code: "SR-090", name: "The Ebony Trimmed Gentleman's Hearth" },
            { code: "SR-091", name: "The Gilded Baroque Marble Fireplace" },
            { code: "SR-092", name: "The Grand Georgian Salon Hearth" },
            { code: "SR-093", name: "The Grand Gilded Mirror Hearth" },
            { code: "SR-094", name: "The Ivory Fluted Column Hearth" },
            { code: "SR-095", name: "The Neoclassical Arch Mantel" },
            { code: "SR-096", name: "The Ornate Grand Hotel Hearth" },
            { code: "SR-097", name: "The Ornate Rococo Marble Mantel" },
            { code: "SR-098", name: "The Regal Gilded Rococo Hearth" },
            { code: "SR-099", name: "The Rich Mahogany Fluted Mantel" },
            { code: "SR-100", name: "The Traditional Ornate Mahogany Mantel" },
            { code: "SR-101", name: "The Victorian Ornate Walnut Hearth" },
          ],
        },
      },
      traditional: {
        styleCode: "ST",
        styleName: "Traditional",
        sets: [],
        items: {
          Cabinet: [
            { code: "ST-001", name: "Art Deco Serpentine Credenza" },
            { code: "ST-002", name: "Burlwood Neoclassical Sideboard Cabinet" },
            { code: "ST-003", name: "Burlwood Serpentine Console Chest" },
            { code: "ST-004", name: "Chic Beige Gilt Sideboard" },
            { code: "ST-005", name: "Chic Burlwood Demi-Lune" },
            { code: "ST-006", name: "Classic Elegance Console" },
            { code: "ST-007", name: "Elegant Burlwood Serpentine Sideboard" },
            { code: "ST-008", name: "Emerald Green Rattan Chest" },
            { code: "ST-009", name: "Emerald Regency Nine-Drawer Dresser" },
            { code: "ST-010", name: "Mahogany Gilded Serpentine Console" },
            { code: "ST-011", name: "Mahogany Marble Top Sideboard" },
            { code: "ST-012", name: "Neoclassical Louis XVI Sideboard" },
            { code: "ST-013", name: "Ornate French Marquetry Commode" },
            { code: "ST-014", name: "Ornate French Marquetry Commode II" },
            { code: "ST-015", name: "Regal Ebony Gilt Sideboard" },
            { code: "ST-016", name: "Regal Serpentine Marble Commode" },
            { code: "ST-017", name: "Regal Walnut Marble Console" },
            { code: "ST-018", name: "Regal Walnut Marble Console II" },
            { code: "ST-019", name: "Royal Class Console" },
            { code: "ST-020", name: "Rustic Four-Drawer Dresser" },
            { code: "ST-021", name: "Serene French Inlaid Console" },
            { code: "ST-022", name: "Serpentine French Provincial Buffet" },
            { code: "ST-023", name: "Sideboards & Buffet Tables Wayfair" },
            { code: "ST-024", name: "Sideboards & Buffet Tables" },
            { code: "ST-025", name: "Trady Class Console" },
            { code: "ST-026", name: "Victorian Dark Wood Dresser" },
            { code: "ST-027", name: "Vintage Vanity" },
          ],
          Console: [
            { code: "ST-028", name: "Antique Mahogany Console Assemblage" },
            { code: "ST-029", name: "Cream Gilded Rococo Console" },
            { code: "ST-030", name: "Dark Walnut Demilune Console" },
            { code: "ST-031", name: "French Provincial Inlay Console" },
            { code: "ST-032", name: "French Regency Mahogany Console" },
            { code: "ST-033", name: "Gilded Baroque Hallway Console" },
            { code: "ST-034", name: "Gilded Cream Rococo Console" },
            { code: "ST-035", name: "Gilded Cream Rococo Console Table" },
            { code: "ST-036", name: "Gilded Finisher Demilune Console" },
            { code: "ST-037", name: "Gilded French Console" },
            { code: "ST-038", name: "Gilded Regency Demilune Classy Console" },
            { code: "ST-039", name: "Gilded Regency Demilune Console" },
            { code: "ST-040", name: "Gilded Rococo Entryway Console" },
            { code: "ST-041", name: "Grandmillennial Vintage Marble Console" },
            { code: "ST-042", name: "Hepplewhite Mahogany Demilune Console" },
            { code: "ST-043", name: "Ornate Carved Entryway" },
            { code: "ST-044", name: "Ornate Marble Top Console" },
            { code: "ST-045", name: "Ornate Mirror Over Wooden Console" },
            { code: "ST-046", name: "Regal Carved Console Ensemble" },
            { code: "ST-047", name: "Rustic Oak Serpentine Console" },
            { code: "ST-048", name: "Traditional Regency Demilune Console" },
            { code: "ST-049", name: "Victorian Rococo Console" },
            { code: "ST-050", name: "Vintage Oak Buffet Console" },
          ],
          Fireplace: [
            { code: "ST-051", name: "The Georgian Heritage Mahogany Hearth" },
            { code: "ST-052", name: "The Mahogany Florentine Relief Hearth" },
            { code: "ST-053", name: "The Richly Carved Ebony Fluted Hearth" },
            { code: "ST-054", name: "The Richly Carved Georgian Mantel" },
          ],
        },
      },
    },
  },
};

// ==========================================
// SEEDING FUNCTIONS
// ==========================================

/**
 * Seed a single room's data (items + sets)
 */
async function seedRoom(roomKey, roomConfig) {
  const { roomName, styles, hasIndividualItems } = roomConfig;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📦 Seeding: ${roomName}`);
  console.log("=".repeat(60));

  // Delete existing data for this room
  const deletedItems = await FurnitureItem.deleteMany({ room: roomName });
  const deletedSets = await FurnitureSet.deleteMany({ room: roomName });
  console.log(`🗑️  Cleared ${deletedItems.deletedCount} items, ${deletedSets.deletedCount} sets`);

  let totalItems = 0;
  let totalSets = 0;

  // Process each style
  for (const [styleKey, styleData] of Object.entries(styles)) {
    console.log(`\n  📂 Style: ${styleData.styleName} (${styleData.styleCode})`);

    // Seed Items
    if (hasIndividualItems && styleData.items) {
      for (const [type, items] of Object.entries(styleData.items)) {
        for (const item of items) {
          const itemDoc = new FurnitureItem({
            room: roomName,
            type: type,
            style: styleData.styleName,
            name: item.name,
            code: item.code,
            images: [],
            description: `${item.name} - ${styleData.styleName} style ${type} for the ${roomName}.`,
          });

          await itemDoc.save();
          totalItems++;
        }
        console.log(`     ✔ ${type}: ${items.length} items`);
      }
    }

    // Seed Sets
    if (styleData.sets && styleData.sets.length > 0) {
      for (const set of styleData.sets) {
        const setDoc = new FurnitureSet({
          room: roomName,
          style: styleData.styleName,
          name: set.name,
          code: set.code,
          items: [],
          images: [],
          description: `${set.name} - ${styleData.styleName} style set for the ${roomName}.`,
        });

        await setDoc.save();
        totalSets++;
      }
      console.log(`     ✔ Sets: ${styleData.sets.length} sets`);
    }
  }

  console.log(`\n  📊 Total: ${totalItems} items, ${totalSets} sets`);
  return { items: totalItems, sets: totalSets };
}

/**
 * Dynamically detect if a room has individual items based on folder structure
 */
function detectHasIndividualItems(folderName) {
  const basePath = path.join(__dirname, "../public/Pawana-Furniture");
  const itemsPath = path.join(basePath, folderName, "items");

  // Check if items folder exists and has content
  if (fs.existsSync(itemsPath)) {
    const contents = fs.readdirSync(itemsPath);
    return contents.some(f => fs.statSync(path.join(itemsPath, f)).isDirectory());
  }
  return false;
}

/**
 * Seed Room documents (the Room collection itself)
 */
async function seedRoomDocuments() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("📦 Seeding Room Documents");
  console.log("=".repeat(60));

  // Clear existing rooms
  await Room.deleteMany({});
  console.log("🗑️  Cleared existing Room documents");

  // Room names and their folder names
  const roomsToCreate = [
    { name: "Living Room", folderName: "living-room" },
    { name: "Dining Room", folderName: "dining-room" },
    { name: "Bedroom", folderName: "bedroom" },
    { name: "Office", folderName: "office" },
    { name: "Showpieces", folderName: "showpieces" },
  ];

  for (const roomInfo of roomsToCreate) {
    // Dynamically detect if room has individual items based on folder structure
    const hasIndividualItems = detectHasIndividualItems(roomInfo.folderName);

    const roomDoc = new Room({
      name: roomInfo.name,
      hasIndividualItems: hasIndividualItems,
      images: [],
      description: `${roomInfo.name} furniture collection.`,
    });
    await roomDoc.save();
    console.log(`  ✔ Created: ${roomInfo.name} (hasIndividualItems: ${hasIndividualItems})`);
  }

  console.log(`\n  📊 Total: ${roomsToCreate.length} rooms`);
}

/**
 * Main seeding function
 */
async function seedAllData() {
  console.log("🚀 Starting Data Seeding Process...\n");
  console.log("Configuration:");
  console.log(JSON.stringify(CONFIG, null, 2));

  // Connect to database
  console.log("\n📡 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected.\n");

  let grandTotalItems = 0;
  let grandTotalSets = 0;

  // Seed Room documents if enabled
  if (CONFIG.seedRoomDocuments) {
    await seedRoomDocuments();
  }

  // Process each enabled room
  for (const [roomKey, enabled] of Object.entries(CONFIG.rooms)) {
    if (!enabled) {
      console.log(`\n⏭️  Skipping: ${roomKey} (disabled in config)`);
      continue;
    }

    const roomConfig = roomData[roomKey];
    if (!roomConfig) {
      console.log(`\n⚠️  No data found for: ${roomKey}`);
      continue;
    }

    // Check if room has actual style data
    if (Object.keys(roomConfig.styles).length === 0) {
      console.log(`\n⚠️  ${roomConfig.roomName}: No styles defined yet, skipping`);
      continue;
    }

    const { items, sets } = await seedRoom(roomKey, roomConfig);
    grandTotalItems += items;
    grandTotalSets += sets;
  }

  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(60));
  console.log(`✔ Total Items Created: ${grandTotalItems}`);
  console.log(`✔ Total Sets Created: ${grandTotalSets}`);

  // Close connection
  await mongoose.connection.close();
  console.log("\n✅ Data seeding complete! 🎉\n");
}

// Run the script
seedAllData().catch((err) => {
  console.error("❌ Error during seeding:", err);
  mongoose.connection.close();
  process.exit(1);
});
