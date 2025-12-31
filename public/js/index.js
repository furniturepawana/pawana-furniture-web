// ========== Mobile Navigation Drawer with Submenu ==========
(function initMobileNav() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileNavDrawer');
  const overlay = document.getElementById('mobileNavOverlay');
  const closeBtn = document.getElementById('mobileNavClose');
  const roomsPanel = document.getElementById('mobileRoomsPanel');
  const roomsPanelBack = document.getElementById('mobileRoomsPanelBack');

  if (!menuBtn || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.classList.add('mobile-nav-open');
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    roomsPanel?.classList.remove('active');
    // Also remove active class from collection dropdown (resets arrow)
    drawer.querySelector('.mobile-nav-dropdown')?.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
  }

  function openRoomsPanel() {
    roomsPanel?.classList.add('active');
  }

  function closeRoomsPanel() {
    roomsPanel?.classList.remove('active');
    // Also collapse any expanded room types
    roomsPanel?.querySelectorAll('.mobile-nav-room.active').forEach(room => {
      room.classList.remove('active');
    });
  }

  // Open on hamburger click
  menuBtn.addEventListener('click', openDrawer);

  // Close on close button click
  closeBtn?.addEventListener('click', closeDrawer);

  // Close on overlay click
  overlay.addEventListener('click', closeDrawer);

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // Collection dropdown - arrow button to toggle submenu
  const collectionArrow = drawer.querySelector('.mobile-nav-dropdown .mobile-nav-arrow-btn');
  const collectionDropdown = drawer.querySelector('.mobile-nav-dropdown');
  if (collectionArrow) {
    collectionArrow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Toggle the rooms panel
      if (roomsPanel?.classList.contains('active')) {
        closeRoomsPanel();
        collectionDropdown?.classList.remove('active');
      } else {
        openRoomsPanel();
        collectionDropdown?.classList.add('active');
      }
    });
  }

  // Rooms panel back button
  roomsPanelBack?.addEventListener('click', closeRoomsPanel);

  // Room arrow buttons - toggle accordion for furniture types
  if (roomsPanel) {
    roomsPanel.querySelectorAll('.mobile-nav-room .mobile-nav-arrow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const roomItem = btn.closest('.mobile-nav-room');

        // Toggle this room's expanded state
        roomItem.classList.toggle('active');
      });
    });
  }

  // Close navigation when clicking on a link (except arrows)
  drawer.querySelectorAll('.mobile-nav-links a:not(.mobile-nav-arrow-btn)').forEach(link => {
    link.addEventListener('click', () => setTimeout(closeDrawer, 100));
  });

  // Close on Collection link text click (not arrow)
  const collectionLinkText = drawer.querySelector('.mobile-nav-dropdown .mobile-nav-link-text');
  if (collectionLinkText) {
    collectionLinkText.addEventListener('click', () => setTimeout(closeDrawer, 100));
  }
})();

// ========== Smooth scroll for anchor links ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetEl = document.querySelector(this.getAttribute("href"));
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ========== Product card animation on scroll ==========
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.product-card').forEach(card => {
  observer.observe(card);
});

// ========== FAQ Accordion functionality for Contact Page ==========
function initializeFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
      // Toggle current item without affecting others
      item.classList.toggle('active');
    });
  });
}

// Initialize FAQ accordion when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeFAQAccordion();
});
