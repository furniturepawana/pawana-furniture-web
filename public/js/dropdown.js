document.addEventListener('DOMContentLoaded', () => {
  // Select all dropdowns
  const dropdowns = document.querySelectorAll('.dropdown');

  dropdowns.forEach(dropdown => {
    const link = dropdown.querySelector('a');
    const content = dropdown.querySelector('.dropdown-content');
    let timeoutId;

    if (!content) return;

    // Function to show dropdown
    const showDropdown = () => {
      clearTimeout(timeoutId);
      content.classList.add('show');
      // Ensure display is block/flex before opacity transition
      if (content.classList.contains('collections-dropdown')) {
        content.style.display = 'flex';
      } else {
        content.style.display = 'block';
      }

      // Small delay to allow display change to register before transition
      requestAnimationFrame(() => {
        content.classList.add('visible');
      });
    };

    // Function to hide dropdown
    const hideDropdown = () => {
      timeoutId = setTimeout(() => {
        content.classList.remove('visible');

        // Wait for transition to finish before hiding
        setTimeout(() => {
          if (!content.classList.contains('visible')) {
            content.classList.remove('show');
            content.style.display = '';
          }
        }, 300); // Match CSS transition duration
      }, 300); // Delay before hiding starts
    };

    // Event listeners for parent dropdown
    dropdown.addEventListener('mouseenter', showDropdown);
    dropdown.addEventListener('mouseleave', hideDropdown);

    // Handle sub-dropdowns (flyouts) similarly
    const dropdownItems = content.querySelectorAll('.dropdown-item');

    dropdownItems.forEach(item => {
      const subDropdown = item.querySelector('.sub-dropdown');
      const arrow = item.querySelector('.arrow');

      if (!subDropdown) return;

      let subTimeoutId;

      const showSubDropdown = () => {
        clearTimeout(subTimeoutId);
        // Ensure parent stays open
        clearTimeout(timeoutId);
        content.classList.add('visible');

        // IMMEDIATELY hide all other sub-dropdowns to prevent ghosting
        dropdownItems.forEach(otherItem => {
          if (otherItem !== item) {
            const otherSub = otherItem.querySelector('.sub-dropdown');
            const otherArrow = otherItem.querySelector('.arrow');
            if (otherSub) {
              otherSub.classList.remove('visible');
              otherSub.style.display = '';
              otherItem.classList.remove('active');
            }
          }
        });

        item.classList.add('active');
        subDropdown.style.display = 'block';
        // Small delay to ensure display:block applies before opacity transition
        requestAnimationFrame(() => {
          subDropdown.classList.add('visible');
        });
      };

      const hideSubDropdown = () => {
        subTimeoutId = setTimeout(() => {
          subDropdown.classList.remove('visible');
          item.classList.remove('active');
          setTimeout(() => {
            if (!subDropdown.classList.contains('visible')) {
              subDropdown.style.display = '';
            }
          }, 300);
        }, 300);
      };

      item.addEventListener('mouseenter', showSubDropdown);
      item.addEventListener('mouseleave', hideSubDropdown);
    });
  });
});
