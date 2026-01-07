// ========== Inline Search Functionality ==========

let searchTimeout = null;
const SEARCH_DEBOUNCE = 300;
let hasTyped = false;

// Toggle search expansion
function toggleSearch(expand) {
  const isMobile = window.innerWidth <= 767;
  const wrapper = document.querySelector('.search-wrapper');

  if (isMobile) {
    const modal = document.getElementById('searchModal');
    const modalInput = modal?.querySelector('.search-modal-input');

    if (expand) {
      modal?.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => modalInput?.focus(), 300);
      showSearchSuggestions();
    } else {
      modal?.classList.remove('active');
      document.body.style.overflow = '';
      clearSearchResults();
    }
    return;
  }

  // Desktop Inline logic
  const searchInput = wrapper?.querySelector('.search-input');
  const header = document.querySelector('.site-header');

  if (wrapper) {
    if (expand) {
      wrapper.classList.add('expanded');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
      showSearchSuggestions();
    } else {
      wrapper.classList.remove('expanded');
      clearSearchResults();
      hasTyped = false;
    }
  }
}

// Perform search
async function performSearch(query) {
  const isMobile = window.innerWidth <= 767;
  const resultsContainer = isMobile
    ? document.querySelector('.search-modal-results')
    : document.querySelector('.search-results');

  if (!resultsContainer) return;

  if (!query || query.trim().length < 1) {
    showSearchSuggestions();
    return;
  }

  // Show loading state
  resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    displaySearchResults(data);
  } catch (error) {
    console.error('Search error:', error);
    resultsContainer.innerHTML = '<p class="search-no-results">An error occurred. Please try again.</p>';
  }
}

// Display search results
function displaySearchResults(data) {
  const isMobile = window.innerWidth <= 767;
  const resultsContainer = isMobile
    ? document.querySelector('.search-modal-results')
    : document.querySelector('.search-results');

  if (!resultsContainer) return;

  const { items, sets } = data;

  if (items.length === 0 && sets.length === 0) {
    resultsContainer.innerHTML = '<p class="search-no-results">No results found</p>';
    return;
  }

  // Store data for filtering
  window.searchResultsData = { items, sets };

  // Build results with filter dropdown
  let html = `
    <div class="search-results-header">
      <div class="search-filter">
        <label for="search-filter-select">Show:</label>
        <select id="search-filter-select">
          <option value="all">All</option>
          <option value="sets">Sets</option>
          <option value="items">Items</option>
        </select>
      </div>
    </div>
    <div class="search-results-content">
  `;

  // Show sets first
  if (sets.length > 0) {
    html += '<div class="search-category" data-type="sets"><h4>Sets</h4>';
    html += sets.map(set => `
      <a href="/set/${set.slug}" class="search-result-item">
        <img src="${set.images?.[0]?.url || '/images/placeholder.jpg'}" alt="${set.name}">
        <div class="search-result-info">
          <span class="search-result-name">${set.name}</span>
          <div class="search-result-meta">
            <span class="search-style-badge ${set.style.toLowerCase()}">${set.style}</span>
            <span class="search-result-text">${set.room}</span>
          </div>
        </div>
      </a>
    `).join('');
    html += '</div>';
  }

  if (items.length > 0) {
    html += '<div class="search-category" data-type="items"><h4>Items</h4>';
    html += items.slice(0, 15).map(item => `
      <a href="/item/${item.slug}" class="search-result-item">
        <img src="${item.images?.[0]?.url || '/images/placeholder.jpg'}" alt="${item.name}">
        <div class="search-result-info">
          <span class="search-result-name">${item.name}</span>
          <div class="search-result-meta">
            <span class="search-style-badge ${item.style.toLowerCase()}">${item.style}</span>
            <span class="search-result-text">${item.room} · ${item.type}</span>
          </div>
        </div>
      </a>
    `).join('');
    html += '</div>';
  }

  html += '</div>';

  resultsContainer.innerHTML = html;

  // Add filter event listener
  const filterSelect = document.getElementById('search-filter-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', function() {
      const value = this.value;
      const setsCategory = resultsContainer.querySelector('.search-category[data-type="sets"]');
      const itemsCategory = resultsContainer.querySelector('.search-category[data-type="items"]');

      if (value === 'all') {
        if (setsCategory) setsCategory.style.display = 'block';
        if (itemsCategory) itemsCategory.style.display = 'block';
      } else if (value === 'sets') {
        if (setsCategory) setsCategory.style.display = 'block';
        if (itemsCategory) itemsCategory.style.display = 'none';
      } else if (value === 'items') {
        if (setsCategory) setsCategory.style.display = 'none';
        if (itemsCategory) itemsCategory.style.display = 'block';
      }
    });
  }
}

// Show default search suggestions
function showSearchSuggestions() {
  const isMobile = window.innerWidth <= 767;
  const resultsContainer = isMobile
    ? document.querySelector('.search-modal-results')
    : document.querySelector('.search-results');

  if (!resultsContainer) return;

  resultsContainer.innerHTML = `
    <div class="search-suggestions">
      <h4>Try searching for</h4>
      <div class="suggestion-list">
        <button class="suggestion-item" data-query="Royal Cabinet">
          <span class="suggestion-text">Royal Cabinet</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
        <button class="suggestion-item" data-query="Modern Bed">
          <span class="suggestion-text">Modern Bed</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
        <button class="suggestion-item" data-query="Living Room Chair">
          <span class="suggestion-text">Living Room Chair</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
        <button class="suggestion-item" data-query="Dining Set">
          <span class="suggestion-text">Dining Set</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
        <button class="suggestion-item" data-query="Traditional Sofa">
          <span class="suggestion-text">Traditional Sofa</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
        <button class="suggestion-item" data-query="Bedroom Royal Set">
          <span class="suggestion-text">Bedroom Royal Set</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
        <button class="suggestion-item" data-query="Office Set">
          <span class="suggestion-text">Office Set</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
        <button class="suggestion-item" data-query="Showpiece Console">
          <span class="suggestion-text">Showpiece Console</span>
          <svg class="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Add click handlers to suggestion items
  resultsContainer.querySelectorAll('.suggestion-item').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      const inputClass = isMobile ? '.search-modal-input' : '.search-input';
      const searchInput = document.querySelector(inputClass);
      if (searchInput) {
        searchInput.value = tag.dataset.query;
        hasTyped = true;
        performSearch(tag.dataset.query);
      }
    });
  });
}

// Clear search results
function clearSearchResults() {
  const isMobile = window.innerWidth <= 767;
  const resultsContainer = isMobile
    ? document.querySelector('.search-modal-results')
    : document.querySelector('.search-results');
  const inputClass = isMobile ? '.search-modal-input' : '.search-input';
  const searchInput = document.querySelector(inputClass);

  if (searchInput) searchInput.value = '';
  if (resultsContainer) resultsContainer.innerHTML = '';
}

// Initialize search functionality
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.search-wrapper');
  const searchIcon = document.querySelector('.search-icon');
  const modal = document.getElementById('searchModal');
  const closeModal = modal?.querySelector('.search-modal-close');
  const modalOverlay = modal?.querySelector('.search-modal-overlay');
  const modalInput = modal?.querySelector('.search-modal-input');

  if (!wrapper) return;

  // Search Icon Click
  searchIcon?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleSearch(true);
  });

  // Expand on hover ONLY on desktop
  searchIcon?.addEventListener('mouseenter', () => {
    if (window.innerWidth > 767) toggleSearch(true);
  });

  // Modal Close Click
  closeModal?.addEventListener('click', () => toggleSearch(false));

  // Modal Overlay (Gaps) Click
  modalOverlay?.addEventListener('click', () => {
    if (!modalInput || modalInput.value.trim() === '') {
      toggleSearch(false);
    }
  });

  // Desktop Inline Close button
  const closeSearch = document.querySelector('.search-box .search-close');
  closeSearch?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSearch(false);
  });

  // Inputs with debounce
  [document.querySelector('.search-input'), modalInput].forEach(input => {
    input?.addEventListener('input', (e) => {
      hasTyped = e.target.value.length > 0;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
      }, SEARCH_DEBOUNCE);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleSearch(false);
    });
  });

  // Close desktop search when clicking outside
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 767 && !wrapper.contains(e.target)) {
      toggleSearch(false);
    }
  });

  // Keyboard shortcut to open search (Ctrl/Cmd + K)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleSearch(true);
    }
  });
});
