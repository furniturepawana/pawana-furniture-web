import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SiteSettings from '../src/models/SiteSettings.js';

dotenv.config();

const seedCatalogueData = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected.');

    const settings = await SiteSettings.findOne();
    if (!settings) {
      console.log('No SiteSettings found. Creating one...');
      await SiteSettings.create({
        catalogue: {
          pageTitle: 'Our Collection',
          pageDescription: 'Explore our exquisite range of handcrafted furniture'
        }
      });
      console.log('Created new settings with catalogue data.');
    } else {
      console.log('Checking catalogue data...');
      let updated = false;

      // Initialize catalogue object if missing
      if (!settings.catalogue) {
        settings.catalogue = {};
      }

      // Check/Update Page Title
      if (!settings.catalogue.pageTitle || settings.catalogue.pageTitle === 'Our Collection') {
        // Enforce the default even if it matches, to ensure it's saved if schema default was virtual
        settings.catalogue.pageTitle = 'Our Collection';
        updated = true;
      }

      // Check/Update Page Description
      if (!settings.catalogue.pageDescription || settings.catalogue.pageDescription === 'Explore our exquisite range of handcrafted furniture') {
        settings.catalogue.pageDescription = 'Explore our exquisite range of handcrafted furniture';
        updated = true;
      }

      if (updated) {
        await settings.save();
        console.log('Catalogue data seeded/updated.');
      } else {
        console.log('Catalogue data already exists and matches defaults.');
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding catalogue data:', error);
    process.exit(1);
  }
};

seedCatalogueData();
