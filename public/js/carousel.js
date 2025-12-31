// ========== Infinite Carousel functionality for Home Page ==========
function initializeCarousel(trackId, prevSelector, nextSelector, thumbId) {
  const carouselTrack = document.querySelector(`#${trackId}`);
  const carouselPrev = document.querySelector(`${prevSelector}`);
  const carouselNext = document.querySelector(`${nextSelector}`);
  const carouselThumb = document.querySelector(`#${thumbId}`);

  if (!carouselTrack) return;

  // Get original items
  const originalItems = Array.from(carouselTrack.querySelectorAll('.carousel-item:not([data-cloned])'));
  if (originalItems.length === 0) return;

  let currentIndex = 0;
  let isAnimating = false;
  const transitionDuration = 700;

  // Clear any existing clones
  const existingClones = carouselTrack.querySelectorAll('.carousel-item[data-cloned]');
  existingClones.forEach(clone => clone.remove());

  // Create clones for infinite scrolling
  function createClones() {
    // Clone first few items and append to the end
    for (let i = 0; i < Math.min(3, originalItems.length); i++) {
      const clone = originalItems[i].cloneNode(true);
      clone.setAttribute('data-cloned', 'true');
      clone.setAttribute('aria-hidden', 'true');
      carouselTrack.appendChild(clone);
    }

    // Clone last few items and prepend to the beginning
    for (let i = Math.max(0, originalItems.length - 3); i < originalItems.length; i++) {
      const clone = originalItems[i].cloneNode(true);
      clone.setAttribute('data-cloned', 'true');
      clone.setAttribute('aria-hidden', 'true');
      carouselTrack.insertBefore(clone, carouselTrack.firstChild);
    }
  }

  // Update active state classes
  function updateActiveStates() {
    const allItems = carouselTrack.querySelectorAll('.carousel-item');
    allItems.forEach(item => item.classList.remove('active'));

    // The current active item is at index (currentIndex + 3)
    const activeItem = allItems[currentIndex + 3];
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  // Move carousel to specific position
  function moveToIndex(index, animate = true) {
    if (isAnimating) return;
    isAnimating = true;

    currentIndex = index;

    // Calculate position
    const itemWidth = originalItems[0].offsetWidth;
    const gap = window.innerWidth <= 767 ? 16 : 32; // Smaller gap on mobile
    const isMobile = window.innerWidth <= 767;

    let offset = (currentIndex + 3) * (itemWidth + gap); // +3 because we prepended 3 items

    // Centering logic for mobile - center the item in the viewport
    if (isMobile) {
      const containerWidth = carouselTrack.parentElement.offsetWidth;
      // Account for the gap on both sides of the centered item
      offset = offset - (containerWidth - itemWidth) / 2 + gap / 2;
    }

    // Apply transformation
    if (animate) {
      carouselTrack.style.transition = `transform ${transitionDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      carouselTrack.style.transform = `translateX(-${offset}px)`;
    } else {
      carouselTrack.style.transition = 'none';
      carouselTrack.style.transform = `translateX(-${offset}px)`;
      carouselTrack.offsetHeight; // Force reflow
      carouselTrack.style.transition = '';
    }

    // Update active visual state immediately or after animation?
    // Usually better during animation for smooth feel
    updateActiveStates();

    // Handle loop transitions
    setTimeout(() => {
      if (currentIndex >= originalItems.length) {
        // Went past last item, jump to first
        currentIndex = 0;
        let resetOffset = (currentIndex + 3) * (itemWidth + gap);
        if (isMobile) {
          const containerWidth = carouselTrack.parentElement.offsetWidth;
          resetOffset = resetOffset - (containerWidth - itemWidth) / 2;
        }
        carouselTrack.style.transition = 'none';
        carouselTrack.style.transform = `translateX(-${resetOffset}px)`;
        carouselTrack.offsetHeight; // Force reflow
        carouselTrack.style.transition = '';
        updateActiveStates();
      } else if (currentIndex < 0) {
        // Went before first item, jump to last
        currentIndex = originalItems.length - 1;
        let resetOffset = (currentIndex + 3) * (itemWidth + gap);
        if (isMobile) {
          const containerWidth = carouselTrack.parentElement.offsetWidth;
          resetOffset = resetOffset - (containerWidth - itemWidth) / 2;
        }
        carouselTrack.style.transition = 'none';
        carouselTrack.style.transform = `translateX(-${resetOffset}px)`;
        carouselTrack.offsetHeight; // Force reflow
        carouselTrack.style.transition = '';
        updateActiveStates();
      }

      // Reset animation flag after a small delay to ensure everything is settled
      setTimeout(() => {
        isAnimating = false;
      }, 50);
    }, animate ? transitionDuration : 0);
  }

  // Navigation functions
  function next() {
    if (isAnimating) return;
    moveToIndex(currentIndex + 1);
  }

  function prev() {
    if (isAnimating) return;
    moveToIndex(currentIndex - 1);
  }

  // Event listeners
  carouselNext?.addEventListener('click', next);
  carouselPrev?.addEventListener('click', prev);

  // Touch support
  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 30;

  carouselTrack.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  carouselTrack.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const distance = touchStartX - touchEndX;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        next();
      } else {
        prev();
      }
    }
  }, { passive: true });

  // Trackpad/wheel support
  let wheelTimeout = null;
  let accumulatedDelta = 0;
  const wheelThreshold = 30;

  carouselTrack.parentElement.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1) {
      e.preventDefault();
      accumulatedDelta += e.deltaX;

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (Math.abs(accumulatedDelta) > wheelThreshold) {
          if (accumulatedDelta > 0) {
            next();
          } else {
            prev();
          }
        }
        accumulatedDelta = 0;
      }, 50);
    }
  }, { passive: false });

  // Initialize carousel
  createClones();
  moveToIndex(0, false); // Position at start without animation
}

// Initialize all carousels when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    // Home page carousels
    // Signature Pieces carousel
    initializeCarousel(
      'signature-carousel-track',
      '[data-carousel="signature"].carousel-prev',
      '[data-carousel="signature"].carousel-next',
      'signature-thumb'
    );

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

    // Item detail page carousel
    initializeCarousel(
      'similar-items-carousel-track',
      '[data-carousel="similar-items"].carousel-prev',
      '[data-carousel="similar-items"].carousel-next',
      'similar-items-thumb'
    );

    // Set detail page carousel
    initializeCarousel(
      'similar-sets-carousel-track',
      '[data-carousel="similar-sets"].carousel-prev',
      '[data-carousel="similar-sets"].carousel-next',
      'similar-sets-thumb'
    );
  }, 100);
});
