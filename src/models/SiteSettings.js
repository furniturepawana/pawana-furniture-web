import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema({
  // Home Page Settings
  home: {
    hero: {
      tagline: {
        type: String,
        default: "Only The Finest Furniture"
      },
      badges: {
        type: [String],
        default: ["Workshop In Rajpura", "Since 1980"]
      },
      stats: [{
        number: {
          type: String,
          required: true
        },
        label: {
          type: String,
          required: true
        }
      }],
      // Hero images (up to 3)
      images: [{
        url: { type: String, default: '' },
        publicId: { type: String, default: '' }
      }],
      activeImageIndex: {
        type: Number,
        default: 0
      }
    },
    featuredCodes: {
      signatureItems: {
        type: [String],
        default: []
      },
      featuredItems: {
        type: [String],
        default: []
      },
      featuredSets: {
        type: [String],
        default: []
      }
    },
    // Browse by rooms codes - Map allows dynamic room names
    browseByRoomCodes: {
      type: Map,
      of: String,
      default: {
        'Living Room': 'LT-04',
        'Dining Room': 'DR-04',
        'Bedroom': 'BR-09',
        'Office': 'OT-02',
        'Showpieces': 'SR-044'
      }
    },
    // Showpieces room page - furniture type images (Map allows dynamic type names)
    showpiecesTypeCodes: {
      type: Map,
      of: String,
      default: {
        'Cabinet': 'SR-033',
        'Console': 'ST-048',
        'Fireplace': 'SR-089'
      }
    },
    // Delivery section on home page
    delivery: {
      title: {
        type: String,
        default: 'Crafted In India, Delivered Worldwide'
      },
      mapImage: {
        url: { type: String, default: 'https://res.cloudinary.com/duiix4ryu/image/upload/v1767895640/Gurgaon_4_-Picsart-BackgroundRemover_upscayl_2x_upscayl-lite-4x_qhszwe.png' },
        publicId: { type: String, default: '' }
      },
      paragraphs: {
        type: [String],
        default: [
          'From Kashmir to Kanyakumari - and across the world, every piece is delivered with utmost care and professional precision.',
          'Each product is securely packed, safe global shipping, and attention to every detail ensure your furniture arrives perfectly.',
          'We ensure reliable global delivery, with expert assembly available on request, wherever you are.',
          'Your furniture, delivered with trust, care, and excellence - worldwide.'
        ]
      },
      indiaLocations: {
        type: [String],
        default: ['Chandigarh', 'Uttrakhand', 'Himachal Pradesh', 'Maharashtra', 'Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Jammu']
      },
      internationalLocations: [{
        name: { type: String, required: true },
        flagImage: {
          url: { type: String, default: '' },
          publicId: { type: String, default: '' }
        }
      }]
    },
    footer: {
      tagline1: { type: String, default: 'We Turn Your Imagination Into Reality' },
      tagline2: { type: String, default: 'Redefining luxury interiors with timeless design and sustainable practices. Since 1980' },
      copyright: { type: String, default: '© 2026 Pawana Furniture. All rights reserved.' }
    },
    // Section Text Configuration
    sections: {
      signaturePieces: {
        title: { type: String, default: 'Signature Pieces' },
        subtitle: { type: String, default: 'Masterpieces that define your living space' }
      },
      featuredItems: {
        title: { type: String, default: 'Featured Items' },
        subtitle: { type: String, default: 'Curated selection of our finest individual pieces' }
      },
      featuredSets: {
        title: { type: String, default: 'Featured Sets' },
        subtitle: { type: String, default: 'Complete furniture collections for every room' }
      },
      browseRooms: {
        title: { type: String, default: 'Browse by Rooms' },
        subtitle: { type: String, default: 'Explore our curated collections for every space in your home' }
      },
      customOrder: {
        title: { type: String, default: 'Ready to Start Your Custom Order?' },
        description: { type: String, default: 'Tell us what you have in mind, and we\'ll help bring your vision to life.' }
      }
    }
  },

  // Contact Page Settings
  contact: {
    pageTitle: {
      type: String,
      default: "Contact Us"
    },
    pageDescription: {
      type: String,
      default: "We'd love to hear from you. Visit our showroom or reach out via phone or email."
    },
    faq: {
      type: [{
        question: { type: String, required: true },
        answer: { type: String, required: true }
      }],
      default: [
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
      ]
    },
    phone1: {
      type: String,
      default: "+91 8360550271"
    },
    phone2: {
      type: String,
      default: "+91 6239811718"
    },
    whatsappEnquiry: {
      type: String,
      default: "918360550271"
    },
    email: {
      type: String,
      default: "pawanafurniture07@gmail.com"
    },
    formEmail: {
      type: String,
      default: "pawanafurniture07@gmail.com"
    },
    address: {
      line1: {
        type: String,
        default: "Pawana Furniture"
      },
      line2: {
        type: String,
        default: "Patiala Road, NH 7"
      },
      line3: {
        type: String,
        default: "Liberty Chowk, Punjab 140401"
      },
      country: {
        type: String,
        default: "India"
      }
    },
    businessHours: {
      weekday: {
        type: String,
        default: "Monday - Saturday: 8:00 AM - 7:30 PM"
      },
      weekend: {
        type: String,
        default: "Sunday: 8:00 AM - 6:30 PM"
      }
    },
    socialMedia: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' }
    },
    formSection: {
      title: { type: String, default: 'Send Us a Message' },
      description: { type: String, default: 'Fill out the form below and we\'ll get back to you within 24 hours' }
    }
  },

  // About Page Settings
  about: {
    pageTitle: { type: String, default: 'About Us' },
    pageDescription: { type: String, default: 'Crafting excellence since 1980.' },
    story: {
      title: { type: String, default: 'Our Story' },
      subtitle: { type: String, default: 'Resilience, Artistry, and a Vision for Perfection.' },
      content: { type: String, default: '' },
      image: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' }
      }
    },
    values: [{
      icon: { type: String, default: 'craftsmanship' },
      title: { type: String, required: true },
      description: { type: String, required: true }
    }],
    process: {
      intro: { type: String, default: '' },
      steps: [{
        title: { type: String, required: true },
        description: { type: String, required: true },
        image: {
          url: { type: String, default: '' },
          publicId: { type: String, default: '' }
        }
      }]
    },
    heritage: {
      title: { type: String, default: '100% Crafted in India' },
      description: { type: String, default: '' }
    },
    cta: {
      title: { type: String, default: 'Start Your Custom Project' },
      description: { type: String, default: 'Let our master craftsmen bring your furniture vision to life. From concept to creation, we\'re here to help you every step of the way.' }
    }
  },

  // Services Page Settings
  services: {
    pageTitle: { type: String, default: 'Our Services' },
    pageDescription: { type: String, default: 'Comprehensive furniture solutions for every need.' },
    intro: {
      title: { type: String, default: 'More Than Just Furniture' },
      description: { type: String, default: '' }
    },
    items: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      features: [{ type: String }],
      image: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' }
      }
    }],
    cta: {
      title: { type: String, default: 'Need a Custom Solution?' },
      description: { type: String, default: 'Let\'s discuss how we can help bring your furniture vision to life' }
    }
  },
  catalogue: {
    pageTitle: { type: String, default: 'Our Collection' },
    pageDescription: { type: String, default: 'Explore our exquisite range of handcrafted furniture' }
  }
}, {
  timestamps: true
});

// Singleton pattern - always get or create the single settings document
siteSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Update settings (upsert)
siteSettingsSchema.statics.updateSettings = async function(updates) {
  return await this.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
};

export default mongoose.model("SiteSettings", siteSettingsSchema);
