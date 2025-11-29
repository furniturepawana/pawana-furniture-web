// ========== Smooth scroll for anchor links ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetEl = document.querySelector(this.getAttribute("href"));
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// ========== Scroll animations for product cards ==========
const observerOptions = {
  threshold: 0.2,
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

// ========== Carousel functionality ==========
const carouselTrack = document.querySelector('#carousel-track');
const carouselPrev = document.querySelector('.carousel-prev');
const carouselNext = document.querySelector('.carousel-next');
const carouselThumb = document.querySelector('.carousel-thumb');
const categoryTabs = document.querySelectorAll('.category-tab');
const categoryPrev = document.querySelector('.category-prev');
const categoryNext = document.querySelector('.category-next');

let currentIndex = 0;
let currentCategory = categoryTabs[0]?.dataset.category || 'items';
let activeItems = [];
let allCarouselItems = Array.from(document.querySelectorAll('.carousel-item'));
const itemsToShow = 4;

// Filter visible items by category
function filterItemsByCategory(category) {
  // First, hide all items and remove active class
  allCarouselItems.forEach(item => {
    if (item.dataset.category === category) {
      item.classList.add('active-category');
      item.style.display = 'block'; // Ensure it's visible for calculation
    } else {
      item.classList.remove('active-category');
      item.style.display = 'none'; // Ensure it's hidden
    }
  });

  // Update active items list
  activeItems = allCarouselItems.filter(item => item.dataset.category === category);

  // Reset index when switching categories
  currentIndex = 0;

  // Force layout update
  updateCarousel();
}

// Update carousel position
function updateCarousel() {
  if (!carouselTrack || activeItems.length === 0) return;

  // Get width of the first active item
  const firstItem = activeItems[0];
  const itemWidth = firstItem ? firstItem.offsetWidth : 280;
  const gap = 32; // Should match CSS gap

  // Calculate how many items fit in the visible area
  const containerWidth = document.querySelector('.carousel-container').offsetWidth;
  const itemsToShow = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));

  const offset = currentIndex * (itemWidth + gap);
  const maxIndex = Math.max(0, activeItems.length - itemsToShow);

  // Ensure currentIndex doesn't exceed maxIndex (e.g. on resize)
  if (currentIndex > maxIndex) {
    currentIndex = maxIndex;
  }

  // Apply transform
  carouselTrack.style.transform = `translateX(-${offset}px)`;

  // Update scrollbar
  if (carouselThumb) {
    if (maxIndex > 0) {
      // Calculate thumb width based on visible ratio
      const visibleRatio = itemsToShow / activeItems.length;
      const thumbWidth = Math.max(10, visibleRatio * 100); // Min 10% width
      carouselThumb.style.width = `${thumbWidth}%`;

      // Calculate position
      const scrollProgress = currentIndex / maxIndex;
      const maxLeft = 100 - thumbWidth;
      const thumbLeft = scrollProgress * maxLeft;

      carouselThumb.style.left = `${thumbLeft}%`;
      carouselThumb.style.display = 'block';
    } else {
      carouselThumb.style.display = 'none';
    }
  }

  // Update button states
  if (carouselPrev) {
    carouselPrev.style.opacity = currentIndex === 0 ? '0.3' : '1';
    carouselPrev.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
  }
  if (carouselNext) {
    carouselNext.style.opacity = currentIndex >= maxIndex ? '0.3' : '1';
    carouselNext.style.pointerEvents = currentIndex >= maxIndex ? 'none' : 'auto';
  }
}

// Button navigation
carouselNext?.addEventListener('click', () => {
  // Recalculate maxIndex here as well to be safe
  const firstItem = activeItems[0];
  const itemWidth = firstItem ? firstItem.offsetWidth : 280;
  const gap = 32;
  const containerWidth = document.querySelector('.carousel-container').offsetWidth;
  const itemsToShow = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));

  const maxIndex = Math.max(0, activeItems.length - itemsToShow);

  if (currentIndex < maxIndex) {
    currentIndex++;
    updateCarousel();
  }
});

carouselPrev?.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateCarousel();
  }
});

// Category tab switching
categoryTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    // Update active tab UI
    categoryTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update logic
    currentCategory = tab.dataset.category;
    filterItemsByCategory(currentCategory);
  });
});

// Category arrow navigation (if exists)
categoryNext?.addEventListener('click', () => {
  const currentTabIndex = Array.from(categoryTabs).findIndex(tab => tab.classList.contains('active'));
  const nextIndex = (currentTabIndex + 1) % categoryTabs.length;
  categoryTabs[nextIndex].click();
});

categoryPrev?.addEventListener('click', () => {
  const currentTabIndex = Array.from(categoryTabs).findIndex(tab => tab.classList.contains('active'));
  const prevIndex = (currentTabIndex - 1 + categoryTabs.length) % categoryTabs.length;
  categoryTabs[prevIndex].click();
});

// ========== Initialize carousel ==========
if (carouselTrack) {
  // Initial filter
  filterItemsByCategory(currentCategory);

  // Wait for layout to stabilize then update again (for correct widths)
  setTimeout(updateCarousel, 100);
}

window.addEventListener('resize', () => {
  updateCarousel();
});
