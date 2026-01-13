import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SiteSettings from '../src/models/SiteSettings.js';

dotenv.config();

const seedCTAAndSocial = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected.');

    let settings = await SiteSettings.findOne();
    if (!settings) {
      console.log('No SiteSettings found. Creating one...');
      settings = new SiteSettings();
    }

    let modified = false;

    // Contact: Social Media
    if (!settings.contact) settings.contact = {};
    if (!settings.contact.socialMedia) settings.contact.socialMedia = {};

    const defaultSocial = {
      instagram: 'https://www.instagram.com/pawana.furniture',
      facebook: 'https://www.facebook.com/pawanafurniture'
    };

    if (!settings.contact.socialMedia.instagram) {
      settings.contact.socialMedia.instagram = defaultSocial.instagram;
      console.log('Set default Instagram URL');
      modified = true;
    }
    if (!settings.contact.socialMedia.facebook) {
      settings.contact.socialMedia.facebook = defaultSocial.facebook;
      console.log('Set default Facebook URL');
      modified = true;
    }

    // Contact: Form Section
    if (!settings.contact.formSection) settings.contact.formSection = {};

    const defaultFormSection = {
      title: 'Send Us a Message',
      description: "Fill out the form below and we'll get back to you within 24 hours"
    };

    if (!settings.contact.formSection.title) {
      settings.contact.formSection.title = defaultFormSection.title;
      console.log('Set default form title');
      modified = true;
    }
    if (!settings.contact.formSection.description) {
      settings.contact.formSection.description = defaultFormSection.description;
      console.log('Set default form description');
      modified = true;
    }

    // About: CTA
    if (!settings.about) settings.about = {};
    if (!settings.about.cta) settings.about.cta = {};

    const defaultAboutCTA = {
      title: 'Start Your Custom Project',
      description: "Let our master craftsmen bring your furniture vision to life. From concept to creation, we're here to help you every step of the way."
    };

    if (!settings.about.cta.title) {
      settings.about.cta.title = defaultAboutCTA.title;
      console.log('Set default About CTA title');
      modified = true;
    }
    if (!settings.about.cta.description) {
      settings.about.cta.description = defaultAboutCTA.description;
      console.log('Set default About CTA description');
      modified = true;
    }

    // Services: CTA
    if (!settings.services) settings.services = {};
    if (!settings.services.cta) settings.services.cta = {};

    const defaultServicesCTA = {
      title: 'Need a Custom Solution?',
      description: "Let's discuss how we can help bring your furniture vision to life"
    };

    if (!settings.services.cta.title) {
      settings.services.cta.title = defaultServicesCTA.title;
      console.log('Set default Services CTA title');
      modified = true;
    }
    if (!settings.services.cta.description) {
      settings.services.cta.description = defaultServicesCTA.description;
      console.log('Set default Services CTA description');
      modified = true;
    }

    if (modified) {
      settings.markModified('contact');
      settings.markModified('about');
      settings.markModified('services');
      await settings.save();
      console.log('CTA and social media settings updated successfully');
    } else {
      console.log('All CTA and social media settings already present');
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding CTA and social media data:', error);
    process.exit(1);
  }
};

seedCTAAndSocial();
