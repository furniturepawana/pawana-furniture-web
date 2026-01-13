import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SiteSettings from '../src/models/SiteSettings.js';

dotenv.config();

const seedHomeSections = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected.');

    const settings = await SiteSettings.findOne();
    if (!settings) {
      console.log('No SiteSettings found. Creating one...');
      await SiteSettings.create({
        home: {
          sections: {
            signaturePieces: {
              title: 'Signature Pieces',
              subtitle: 'Masterpieces that define your living space'
            },
            featuredItems: {
              title: 'Featured Items',
              subtitle: 'Curated selection of our finest individual pieces'
            },
            featuredSets: {
              title: 'Featured Sets',
              subtitle: 'Complete furniture collections for every room'
            },
            browseRooms: {
              title: 'Browse by Rooms',
              subtitle: 'Explore our curated collections for every space in your home'
            },
            customOrder: {
              title: 'Ready to Start Your Custom Order?',
              description: 'Tell us what you have in mind, and we\'ll help bring your vision to life.'
            }
          }
        }
      });
      console.log('Created new settings with home sections data.');
    } else {
      console.log('Checking home sections data...');
      let updated = false;

      // Initialize sections object if missing
      if (!settings.home) {
        settings.home = {};
      }
      if (!settings.home.sections) {
        settings.home.sections = {};
      }

      const defaults = {
        signaturePieces: {
          title: 'Signature Pieces',
          subtitle: 'Masterpieces that define your living space'
        },
        featuredItems: {
          title: 'Featured Items',
          subtitle: 'Curated selection of our finest individual pieces'
        },
        featuredSets: {
          title: 'Featured Sets',
          subtitle: 'Complete furniture collections for every room'
        },
        browseRooms: {
          title: 'Browse by Rooms',
          subtitle: 'Explore our curated collections for every space in your home'
        },
        customOrder: {
          title: 'Ready to Start Your Custom Order?',
          description: 'Tell us what you have in mind, and we\'ll help bring your vision to life.'
        }
      };

      // Check/Update each section
      for (const [key, value] of Object.entries(defaults)) {
        if (!settings.home.sections[key]) {
          settings.home.sections[key] = value;
          console.log(`Set default ${key}`);
          updated = true;
        } else {
          // Update if matching defaults (to ensure persistence)
          const needsUpdate = Object.entries(value).some(([prop, val]) =>
            !settings.home.sections[key][prop] ||
            settings.home.sections[key][prop] === val
          );
          if (needsUpdate) {
            settings.home.sections[key] = { ...settings.home.sections[key], ...value };
            console.log(`Confirmed/updated ${key}`);
            updated = true;
          }
        }
      }

      if (updated) {
        settings.markModified('home');
        await settings.save();
        console.log('Home sections data seeded/updated.');
      } else {
        console.log('Home sections data already exists and matches defaults.');
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding home sections data:', error);
    process.exit(1);
  }
};

seedHomeSections();
