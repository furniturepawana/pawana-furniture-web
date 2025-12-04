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

// ========== Dual Carousel functionality for Home Page ==========
function initializeCarousel(trackId, prevSelector, nextSelector, thumbId) {
  const carouselTrack = document.querySelector(`#${trackId}`);
  const carouselPrev = document.querySelector(`${prevSelector}`);
  const carouselNext = document.querySelector(`${nextSelector}`);
  const carouselThumb = document.querySelector(`#${thumbId}`);

  if (!carouselTrack) return; // Exit if carousel doesn't exist

  let currentIndex = 0;
  const activeItems = Array.from(carouselTrack.querySelectorAll('.carousel-item'));

  // Update carousel position
  function updateCarousel() {
    if (activeItems.length === 0) return;

    const firstItem = activeItems[0];
    const itemWidth = firstItem ? firstItem.offsetWidth : 280;
    const gap = 32;

    // Calculate how many items fit in the visible area
    const containerWidth = carouselTrack.parentElement.offsetWidth;
    const itemsToShow = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));

    const offset = currentIndex * (itemWidth + gap);
    const maxIndex = Math.max(0, activeItems.length - itemsToShow);

    // Ensure currentIndex doesn't exceed maxIndex
    if (currentIndex > maxIndex) {
      currentIndex = maxIndex;
    }

    // Apply transform
    carouselTrack.style.transform = `translateX(-${offset}px)`;

    // Update scrollbar
    if (carouselThumb) {
      if (maxIndex > 0) {
        const visibleRatio = itemsToShow / activeItems.length;
        const thumbWidth = Math.max(10, visibleRatio * 100);
        carouselThumb.style.width = `${thumbWidth}%`;

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
    const firstItem = activeItems[0];
    const itemWidth = firstItem ? firstItem.offsetWidth : 280;
    const gap = 32;
    const containerWidth = carouselTrack.parentElement.offsetWidth;
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

  // Initialize
  setTimeout(updateCarousel, 100);
  window.addEventListener('resize', () => {
    updateCarousel();
  });
}

// Initialize both carousels
initializeCarousel(
  'items-carousel-track',
  '[data-carousel="items"].carousel-prev',
  '[data-carousel="items"].carousel-next',
  'items-thumb'
);

initializeCarousel(
  'sets-carousel-track',
  '[data-carousel="sets"].carousel-prev',
  '[data-carousel="sets"].carousel-next',
  'sets-thumb'
);

initializeCarousel(
  'signature-carousel-track',
  '[data-carousel="signature"].carousel-prev',
  '[data-carousel="signature"].carousel-next',
  'signature-thumb'
);

initializeCarousel(
  'similar-sets-carousel-track',
  '[data-carousel="similar-sets"].carousel-prev',
  '[data-carousel="similar-sets"].carousel-next',
  null // No scrollbar for similar sets
);
