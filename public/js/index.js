// Simple header effect

// Smooth scroll for anchor links (future sections)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth"
    });
  });
});

// Scroll animations for product cards
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

// Carousel functionality
const carouselTrack = document.querySelector('#carousel-track');
const carouselPrev = document.querySelector('.carousel-prev');
const carouselNext = document.querySelector('.carousel-next');
const carouselThumb = document.querySelector('.carousel-thumb');
const categoryTabs = document.querySelectorAll('.category-tab');
const categoryPrev = document.querySelector('.category-prev');
const categoryNext = document.querySelector('.category-next');

let currentIndex = 0;
let currentCategory = 'beds';
let activeItems = [];
let allCarouselItems = [];
const itemsToShow = 4;

// Load carousel products from JSON
async function loadCarouselProducts() {
  try {
    const response = await fetch('/data/carousel-products.json');
    const products = await response.json();
    renderCarouselProducts(products);
  } catch (error) {
    console.error('Error loading carousel products:', error);
  }
}

function renderCarouselProducts(products) {
  if (!carouselTrack) return;
  
  carouselTrack.innerHTML = products.map(product => `
    <div class="carousel-item" data-category="${product.category}">
      <img src="${product.imageUrl}" alt="${product.name}">
      <h4>${product.name}</h4>
      <p>${product.description}</p>
    </div>
  `).join('');
  
  // Update references after rendering
  allCarouselItems = document.querySelectorAll('.carousel-item');
  
  // Initialize carousel
  filterItemsByCategory(currentCategory);
  updateCarousel();
}

function filterItemsByCategory(category) {
  allCarouselItems.forEach(item => {
    if (item.dataset.category === category) {
      item.classList.add('active-category');
    } else {
      item.classList.remove('active-category');
    }
  });
  activeItems = Array.from(allCarouselItems).filter(item => item.dataset.category === category);
}

function updateCarousel() {
  const itemWidth = activeItems[0]?.offsetWidth || 280;
  const gap = 32; // 2rem
  const offset = currentIndex * (itemWidth + gap);
  const maxIndex = Math.max(0, activeItems.length - itemsToShow);
  
  if (carouselTrack) {
    carouselTrack.style.transform = `translateX(-${offset}px)`;
  }
  
  // Update scrollbar thumb
  if (carouselThumb && maxIndex > 0) {
    const thumbPosition = (currentIndex / maxIndex) * 60; // 60% is remaining space
    carouselThumb.style.left = `${thumbPosition}%`;
  } else if (carouselThumb) {
    carouselThumb.style.left = '0%';
  }

  // Update button states
  if (carouselPrev) carouselPrev.style.opacity = currentIndex === 0 ? '0.3' : '0.7';
  if (carouselNext) carouselNext.style.opacity = currentIndex >= maxIndex ? '0.3' : '0.7';
}

if (carouselNext) {
  carouselNext.addEventListener('click', () => {
    const maxIndex = Math.max(0, activeItems.length - itemsToShow);
    if (currentIndex < maxIndex) {
      currentIndex++;
      updateCarousel();
    }
  });
}

if (carouselPrev) {
  carouselPrev.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });
}

// Category tab switching
categoryTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    categoryTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategory = tab.dataset.category;
    currentIndex = 0;
    filterItemsByCategory(currentCategory);
    updateCarousel();
  });
});

// Category arrow navigation
if (categoryNext) {
  categoryNext.addEventListener('click', () => {
    const currentTabIndex = Array.from(categoryTabs).findIndex(tab => tab.classList.contains('active'));
    const nextIndex = (currentTabIndex + 1) % categoryTabs.length;
    categoryTabs[nextIndex].click();
  });
}

if (categoryPrev) {
  categoryPrev.addEventListener('click', () => {
    const currentTabIndex = Array.from(categoryTabs).findIndex(tab => tab.classList.contains('active'));
    const prevIndex = (currentTabIndex - 1 + categoryTabs.length) % categoryTabs.length;
    categoryTabs[prevIndex].click();
  });
}

// Initialize carousel when DOM is ready
if (carouselTrack) {
  loadCarouselProducts();
}

window.addEventListener('resize', updateCarousel);
