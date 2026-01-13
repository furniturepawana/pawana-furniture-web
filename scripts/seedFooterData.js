
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SiteSettings from '../src/models/SiteSettings.js';

dotenv.config();

const seedFooterData = async () => {
  try {
    if (!process.env.DB_URI) {
      throw new Error('DB_URI environment variable is not defined');
    }

    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB');

    let settings = await SiteSettings.findOne();
    if (!settings) {
      console.log('No settings found. Creating new...');
      settings = new SiteSettings();
    }

    // Initialize home if missing
    if (!settings.home) settings.home = {};
    if (!settings.home.footer) settings.home.footer = {};

    let modified = false;

    const defaults = {
      tagline1: 'We Turn Your Imagination Into Reality',
      tagline2: 'Redefining luxury interiors with timeless design and sustainable practices. Since 1980',
      copyright: `© ${new Date().getFullYear()} Pawana Furniture. All rights reserved.`
    };

    // Check/Update Tagline 1 - enforce default even if it matches, to ensure it's saved
    if (!settings.home.footer.tagline1 || settings.home.footer.tagline1 === defaults.tagline1) {
      settings.home.footer.tagline1 = defaults.tagline1;
      console.log('Set/confirmed tagline1');
      modified = true;
    }

    // Check/Update Tagline 2
    if (!settings.home.footer.tagline2 || settings.home.footer.tagline2 === defaults.tagline2) {
      settings.home.footer.tagline2 = defaults.tagline2;
      console.log('Set/confirmed tagline2');
      modified = true;
    }

    // Check/Update Copyright - allow dynamic year updates
    if (!settings.home.footer.copyright || settings.home.footer.copyright.includes('2026') || settings.home.footer.copyright === defaults.copyright) {
      settings.home.footer.copyright = defaults.copyright;
      console.log('Set/confirmed copyright');
      modified = true;
    }

    if (modified) {
      settings.markModified('home'); // Essential for mixed/nested types sometimes
      await settings.save();
      console.log('Footer settings updated successfully');
    } else {
      console.log('Footer settings already present');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding footer data:', error);
    process.exit(1);
  }
};

seedFooterData();
