import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SiteSettings from '../src/models/SiteSettings.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URL = process.env.DB_URI;

const seedDeliveryData = async () => {
  try {
    if (!MONGO_URL) {
      throw new Error('DB_URI is missing from environment variables');
    }

    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URL);
    console.log('Connected.');

    const settings = await SiteSettings.findOne();
    if (!settings) {
      console.log('No settings document found. Skipping.');
      return;
    }

    console.log('Current delivery settings:', JSON.stringify(settings.home.delivery, null, 2));

    let updated = false;

    // Initialize delivery object if missing
    if (!settings.home.delivery) {
      settings.home.delivery = {};
    }

    // Seed International Locations if empty
    if (!settings.home.delivery.internationalLocations || settings.home.delivery.internationalLocations.length === 0) {
      console.log('Seeding default International Location (UAE)...');
      settings.home.delivery.internationalLocations = [{
        name: 'UAE (Dubai)',
        flagImage: {
          url: 'https://res.cloudinary.com/duiix4ryu/image/upload/v1768307975/uae-flag_v1gbmj.png',
          publicId: ''
        }
      }];
      updated = true;
    }

    // Seed Default Title if missing
    if (!settings.home.delivery.title) {
      settings.home.delivery.title = 'Crafted In India, Delivered Worldwide';
      updated = true;
    }

    // Seed Default Map Image if missing
    if (!settings.home.delivery.mapImage || !settings.home.delivery.mapImage.url) {
      settings.home.delivery.mapImage = {
        url: 'https://res.cloudinary.com/duiix4ryu/image/upload/v1767895640/Gurgaon_4_-Picsart-BackgroundRemover_upscayl_2x_upscayl-lite-4x_qhszwe.png',
        publicId: ''
      };
      updated = true;
    }

    // Seed Paragraphs if missing
    if (!settings.home.delivery.paragraphs || settings.home.delivery.paragraphs.length === 0) {
      console.log('Seeding default paragraphs...');
      settings.home.delivery.paragraphs = [
        'From Kashmir to Kanyakumari - and across the world, every piece is delivered with utmost care and professional precision.',
        'Each product is securely packed, safe global shipping, and attention to every detail ensure your furniture arrives perfectly.',
        'We ensure reliable global delivery, with expert assembly available on request, wherever you are.',
        'Your furniture, delivered with trust, care, and excellence - worldwide.'
      ];
      updated = true;
    }

    // Seed India Locations if missing
    if (!settings.home.delivery.indiaLocations || settings.home.delivery.indiaLocations.length === 0) {
      console.log('Seeding default India locations...');
      settings.home.delivery.indiaLocations = ['Chandigarh', 'Uttrakhand', 'Himachal Pradesh', 'Maharashtra', 'Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Jammu'];
      updated = true;
    }

    // Seed Contact Page Meta - Overwrite schema default if it matches
    if (!settings.contact.pageTitle || settings.contact.pageTitle === 'Contact Us') {
      settings.contact.pageTitle = 'Get in Touch';
      settings.contact.pageDescription = "Let's discuss how we can bring your furniture vision to life";
      updated = true;
    }

    // Seed Contact FAQ
    if (!settings.contact.faq || settings.contact.faq.length === 0) {
      console.log('Seeding default FAQs...');
      settings.contact.faq = [
        {
          question: "Do you offer home consultations?",
          answer: "Yes! We offer complimentary home consultations for custom furniture projects. Contact us to schedule an appointment."
        },
        {
          question: "What is your delivery timeframe?",
          answer: "Standard items are delivered within 2-4 weeks. Custom pieces typically take 6-8 weeks depending on complexity."
        },
        {
          question: "Do you ship nationwide?",
          answer: "Yes, we ship across India. Delivery charges vary based on location and order size."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept cash, credit/debit cards, bank transfers, and offer flexible EMI options for larger purchases."
        }
      ];
      updated = true;
    }

    // Seed About Page Meta
    if (!settings.about.pageTitle || settings.about.pageTitle === 'About Us') {
      settings.about.pageTitle = 'About Pawana ';
      settings.about.pageDescription = 'A story shaped by craftsmanship, experience, and care.';
      updated = true;
    }

    // Seed Services Page Meta
    // Schema default 'Our Services' matches target, so we can leave it or force it.
    // Description default differs.
    if (!settings.services.pageDescription || settings.services.pageDescription === 'Comprehensive furniture solutions for every need.') {
      settings.services.pageTitle = 'Our Services';
      settings.services.pageDescription = 'Services designed to make your furniture experience easy.';
      updated = true;
    }

    if (updated) {
      await settings.save();
      console.log('Validation complete. Data saved successfully.');
    } else {
      console.log('No updates needed. Data already exists.');
    }

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Done.');
  }
};

seedDeliveryData();
