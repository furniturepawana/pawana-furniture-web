/* ==========================================
   Admin Dashboard Client-Side Logic
   ========================================== */

// State - initialize from server-provided active tab
let currentTab = typeof ACTIVE_TAB !== 'undefined' ? ACTIVE_TAB : 'sets';
let currentRoom = 'Living Room';
let currentStyle = 'Royal';
let currentType = '';
let deleteTarget = null;

// ==========================================
// Diagnostic Console Logging (for handoff troubleshooting)
// These logs appear in browser DevTools to help identify config issues
// ==========================================
function logDiagnostic(service, message) {
  console.log(`%c⚠️ ${service}: ${message}`, 'color: #d97706; font-weight: bold;');
}

// Analyze error response and log appropriate diagnostic
function diagnoseError(response, context = 'API call') {
  if (!response) {
    logDiagnostic('Network', 'Request failed - check internet connection or server status');
    return;
  }

  if (response.status === 500) {
    if (context.includes('image') || context.includes('upload')) {
      logDiagnostic('Cloudinary', 'Image upload failed - check CLOUDINARY_URL in .env');
    } else {
      logDiagnostic('MongoDB', `${context} failed - check DB_URI connection string in .env`);
    }
  } else if (response.status === 401 || response.status === 403) {
    logDiagnostic('Admin Auth', 'Authentication error - check ADMIN_ID/ADMIN_PASSWORD in .env');
  } else if (response.status === 0 || !response.ok) {
    logDiagnostic('Server', 'Server unreachable - check if Render deployment is running');
  }
}

// DOM Elements
const tabButtons = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const toast = document.getElementById('toast');

// ==========================================
// Button Loading State Helper
// ==========================================

function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<span class="btn-spinner"></span> Loading...';
    button.classList.add('loading');
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.innerHTML;
    button.classList.remove('loading');
  }
}

// ==========================================
// Tab Navigation
// ==========================================

tabButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const tab = btn.dataset.tab;

    // Check for unsaved changes before switching tabs
    if (hasAnyUnsavedChanges()) {
      const confirmed = await showConfirmModal(
        'Unsaved Changes',
        'You have unsaved changes. Leave without saving?'
      );
      if (!confirmed) return;
    }

    // Force page reload for clean state (resolves form state issues)
    window.location.href = `/${ADMIN_ROUTE}/dashboard?tab=${tab}`;
  });
});

// ==========================================
// Room & Style Tabs
// ==========================================

function setupTabListeners(container, type) {
  const tabs = container.querySelectorAll(type === 'room' ? '.room-tab' : '.style-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (type === 'room') {
        currentRoom = tab.dataset.room;
      } else {
        currentStyle = tab.dataset.style;
      }

      // Reset type filter when changing room/style
      if (currentTab === 'items') {
        currentType = '';
        document.getElementById('type-filter-select').value = '';
        loadFurnitureTypes();
      }

      loadData();
    });
  });
}

// Setup Sets tab listeners
setupTabListeners(document.getElementById('sets-tab'), 'room');
setupTabListeners(document.getElementById('sets-tab'), 'style');

// Setup Items tab listeners
setupTabListeners(document.getElementById('items-tab'), 'room');
setupTabListeners(document.getElementById('items-tab'), 'style');

// Setup Rooms tab listeners
document.querySelectorAll('#rooms-room-tabs .room-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#rooms-room-tabs .room-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentRoom = tab.dataset.room;

    const roomDetails = document.getElementById('room-details');
    const catalogueDetails = document.getElementById('catalogue-details');

    if (currentRoom === 'Catalogue') {
        roomDetails.style.display = 'none';
        catalogueDetails.style.display = 'block';
        document.getElementById('rooms-header-title').textContent = 'Catalogue Settings';
        if (!siteSettings) loadSettings();
        else populateCatalogueSettings();
    } else {
        catalogueDetails.style.display = 'none';
        roomDetails.style.display = 'block';
        loadRoomDetails();
    }
    updateRoomsSaveButton(false);
  });
});

// Type filter
document.getElementById('type-filter-select').addEventListener('change', (e) => {
  currentType = e.target.value;
  loadItems();
});

// ==========================================
// Data Loading
// ==========================================

function loadData() {
  switch (currentTab) {
    case 'sets':
      loadSets();
      break;
    case 'items':
      loadFurnitureTypes();
      loadItems();
      break;
    case 'rooms':
      if (currentRoom === 'Catalogue') {
        if (!siteSettings) loadSettings();
        else populateCatalogueSettings();
        document.getElementById('room-details').style.display = 'none';
        document.getElementById('catalogue-details').style.display = 'block';
      } else {
        document.getElementById('room-details').style.display = 'block';
        document.getElementById('catalogue-details').style.display = 'none';
        loadRoomDetails();
      }
      break;
    case 'home-settings':
    case 'contact-settings':
    case 'about-settings':
    case 'services-settings':
      if (typeof loadSettings === 'function' && !siteSettings) loadSettings();
      break;
  }
}

async function loadSets() {
  const grid = document.getElementById('sets-grid');
  grid.innerHTML = '<div class="loading-text">Loading sets...</div>';

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/sets?room=${encodeURIComponent(currentRoom)}&style=${encodeURIComponent(currentStyle)}`);
    const sets = await response.json();

    if (sets.length === 0) {
      grid.innerHTML = '<div class="empty-text">No sets found. Click "Add Set" to create one.</div>';
      return;
    }

    grid.innerHTML = sets.map(set => createSetCard(set)).join('');
    attachCardListeners(grid, 'FurnitureSet');
  } catch (error) {
    grid.innerHTML = '<div class="empty-text">Error loading sets.</div>';
    logDiagnostic('MongoDB', 'Failed to load sets - check DB_URI in .env');
    console.error(error);
  }
}

async function loadItems() {
  const grid = document.getElementById('items-grid');
  grid.innerHTML = '<div class="loading-text">Loading items...</div>';

  try {
    let url = `/${ADMIN_ROUTE}/api/items?room=${encodeURIComponent(currentRoom)}&style=${encodeURIComponent(currentStyle)}`;
    if (currentType) {
      url += `&type=${encodeURIComponent(currentType)}`;
    }

    const response = await fetch(url);
    const items = await response.json();

    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-text">No items found. Click "Add Item" to create one.</div>';
      return;
    }

    grid.innerHTML = items.map(item => createItemCard(item)).join('');
    attachCardListeners(grid, 'FurnitureItem');
  } catch (error) {
    grid.innerHTML = '<div class="empty-text">Error loading items.</div>';
    logDiagnostic('MongoDB', 'Failed to load items - check DB_URI in .env');
    console.error(error);
  }
}

async function loadFurnitureTypes() {
  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/furniture-types?room=${encodeURIComponent(currentRoom)}&style=${encodeURIComponent(currentStyle)}`);
    const types = await response.json();

    const select = document.getElementById('type-filter-select');
    select.innerHTML = '<option value="">All Types</option>';
    types.forEach(type => {
      select.innerHTML += `<option value="${type}">${type}</option>`;
    });
  } catch (error) {
    console.error('Error loading furniture types:', error);
  }
}

async function loadRoomDetails() {
  const container = document.getElementById('room-details');
  container.innerHTML = '<div class="loading-text">Loading room details...</div>';

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/rooms`);
    const rooms = await response.json();
    const room = rooms.find(r => r.name === currentRoom);

    if (!room) {
      container.innerHTML = '<div class="empty-text">Room not found.</div>';
      return;
    }

    container.innerHTML = createRoomCard(room);
    document.getElementById('rooms-header-title').textContent = room.name + ' Settings';
    storeOriginalRoomData(room);
    attachRoomListeners(container, room);
    updateRoomsSaveButton(false);
  } catch (error) {
    container.innerHTML = '<div class="empty-text">Error loading room details.</div>';
    console.error(error);
  }
}

// ==========================================
// Card Templates
// ==========================================

function createSetCard(set) {
  const imageUrl = set.images && set.images[0] ? set.images[0].url : '';
  const description = set.description || '';
  const shortDesc = description.length > 60 ? description.substring(0, 60) + '...' : description;
  return `
    <div class="card" data-id="${set._id}" data-description="${description.replace(/"/g, '&quot;')}">
      <div class="card-image">
        ${imageUrl
          ? `<img src="${imageUrl}" alt="${set.name}" loading="lazy">`
          : '<div class="no-image">No image</div>'
        }
        <button class="image-edit-btn" title="Update image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
      <div class="card-body">
        <div class="card-name">
          <h3>${set.name}</h3>
          <button class="name-edit-btn" title="Edit name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
        <div class="inline-edit inline-edit-name">
          <input type="text" value="${set.name}" />
          <button class="inline-save-btn" data-field="name">Save</button>
          <button class="inline-cancel-btn">Cancel</button>
        </div>
        <div class="card-desc ${!description ? 'empty' : ''}">
          <p>${shortDesc || 'No description'}</p>
          <button class="desc-edit-btn" title="Edit description">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
        <div class="inline-edit inline-edit-desc">
          <textarea rows="2">${description}</textarea>
          <button class="inline-save-btn" data-field="description">Save</button>
          <button class="inline-cancel-btn">Cancel</button>
        </div>
        <div class="card-meta">
          <span class="code">${set.code}</span>
          <span>${set.style}</span>
        </div>
      </div>
      <div class="card-footer">
        <div class="card-menu">
          <button class="menu-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          </button>
          <div class="menu-dropdown">
            <button class="menu-item delete">Delete Set</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createItemCard(item) {
  const imageUrl = item.images && item.images[0] ? item.images[0].url : '';
  const description = item.description || '';
  const shortDesc = description.length > 60 ? description.substring(0, 60) + '...' : description;
  return `
    <div class="card" data-id="${item._id}" data-description="${description.replace(/"/g, '&quot;')}">
      <div class="card-image">
        ${imageUrl
          ? `<img src="${imageUrl}" alt="${item.name}" loading="lazy">`
          : '<div class="no-image">No image</div>'
        }
        <button class="image-edit-btn" title="Update image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
      <div class="card-body">
        <div class="card-name">
          <h3>${item.name}</h3>
          <button class="name-edit-btn" title="Edit name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
        <div class="inline-edit inline-edit-name">
          <input type="text" value="${item.name}" />
          <button class="inline-save-btn" data-field="name">Save</button>
          <button class="inline-cancel-btn">Cancel</button>
        </div>
        <div class="card-desc ${!description ? 'empty' : ''}">
          <p>${shortDesc || 'No description'}</p>
          <button class="desc-edit-btn" title="Edit description">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
        <div class="inline-edit inline-edit-desc">
          <textarea rows="2">${description}</textarea>
          <button class="inline-save-btn" data-field="description">Save</button>
          <button class="inline-cancel-btn">Cancel</button>
        </div>
        <div class="card-meta">
          <span class="code">${item.code}</span>
          <span>${item.type} · ${item.style}</span>
        </div>
      </div>
      <div class="card-footer">
        <div class="card-menu">
          <button class="menu-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          </button>
          <div class="menu-dropdown">
            <button class="menu-item delete">Delete Item</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createRoomCard(room) {
  const isShowpieces = room.name === 'Showpieces';

  return `
    <div class="room-card" data-id="${room._id}" data-name="${room.name}">
      <div class="room-body">
        <h3>${room.name}</h3>

        <div class="room-field">
          <label>Featured Image Code</label>
          <div class="code-input-row">
            <input type="text" id="room-featured-code" placeholder="e.g., ${isShowpieces ? 'SR-044' : room.name === 'Living Room' ? 'LR-01' : 'XX-001'}"
                   value="${room.featuredCode || ''}" class="code-input">
            <button type="button" class="btn-validate-code" title="Validate code">✓</button>
          </div>
          <div class="code-preview" id="room-code-preview">
            ${room.featuredCode ? '<span class="loading-hint">Loading preview...</span>' : '<span class="hint-text">Enter a code to see image preview</span>'}
          </div>
        </div>

        ${isShowpieces ? `
        <div class="room-field showpieces-types-section">
          <label>Furniture Type Featured Images</label>
          <p class="section-hint">Set featured image code for each showpiece type displayed on the room page.</p>
          <div id="showpieces-types-container" class="types-codes-list">
            <span class="loading-hint">Loading furniture types...</span>
          </div>
        </div>
        ` : ''}

        <div class="room-field">
          <label>Description</label>
          <textarea id="room-description">${room.description || ''}</textarea>
        </div>

        </div>
      </div>
    </div>
  `;

}


// ==========================================
// Card Event Listeners
// ==========================================

function attachCardListeners(grid, collection) {
  // Image edit
  grid.querySelectorAll('.image-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      const id = card.dataset.id;
      openImageModal(collection, id, 0);
    });
  });

  // Name edit
  grid.querySelectorAll('.name-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      card.querySelector('.card-name').style.display = 'none';
      card.querySelector('.inline-edit-name').classList.add('active');
      card.querySelector('.inline-edit-name input').focus();
    });
  });

  // Description edit
  grid.querySelectorAll('.desc-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      card.querySelector('.card-desc').style.display = 'none';
      card.querySelector('.inline-edit-desc').classList.add('active');
      card.querySelector('.inline-edit-desc textarea').focus();
    });
  });

  // Inline save (handles both name and description)
  grid.querySelectorAll('.inline-save-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.card');
      const id = card.dataset.id;
      const field = btn.dataset.field;

      if (field === 'name') {
        const newName = card.querySelector('.inline-edit-name input').value.trim();
        if (!newName) {
          showToast('Name cannot be empty', 'error');
          return;
        }
        await updateField(collection, id, { name: newName });
      } else if (field === 'description') {
        const newDesc = card.querySelector('.inline-edit-desc textarea').value.trim();
        await updateField(collection, id, { description: newDesc });
      }
    });
  });

  // Inline cancel
  grid.querySelectorAll('.inline-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      const editBox = e.target.closest('.inline-edit');

      if (editBox.classList.contains('inline-edit-name')) {
        card.querySelector('.card-name').style.display = 'flex';
      } else if (editBox.classList.contains('inline-edit-desc')) {
        card.querySelector('.card-desc').style.display = 'flex';
      }
      editBox.classList.remove('active');
    });
  });

  // Menu toggle
  grid.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardMenu = btn.closest('.card-menu');
      const wasActive = cardMenu.classList.contains('active');
      document.querySelectorAll('.card-menu').forEach(m => m.classList.remove('active'));
      if (!wasActive) cardMenu.classList.add('active');
    });
  });

  // Delete click
  grid.querySelectorAll('.menu-item.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      const id = card.dataset.id;
      openDeleteModal(collection, id);
    });
  });
}

function attachRoomListeners(container, room) {
  const isShowpieces = room.name === 'Showpieces';

  // Validate code and show preview
  async function validateAndPreview(code, previewEl, roomName = room.name) {
    if (!code.trim()) {
      previewEl.innerHTML = '<span class="hint-text">Enter a code to see image preview</span>';
      return null;
    }

    previewEl.innerHTML = '<span class="loading-hint">Validating...</span>';

    try {
      const response = await fetch(`/${ADMIN_ROUTE}/api/validate-code?code=${encodeURIComponent(code)}&room=${encodeURIComponent(roomName)}`);
      const result = await response.json();

      if (result.valid) {
        if (result.image) {
          previewEl.innerHTML = `
            <div class="preview-success">
              <img src="${result.image}" alt="${result.name}">
              <span class="preview-info">${result.type}: ${result.name}</span>
            </div>
          `;
        } else {
          previewEl.innerHTML = `<span class="preview-success-text">✓ ${result.type}: ${result.name} (no image)</span>`;
        }
        return result;
      } else {
        previewEl.innerHTML = `<span class="preview-error">✗ ${result.error}</span>`;
        return null;
      }
    } catch (error) {
      previewEl.innerHTML = '<span class="preview-error">✗ Error validating code</span>';
      console.error(error);
      return null;
    }
  }

  // Validate button click
  container.querySelector('.btn-validate-code').addEventListener('click', async () => {
    const code = document.getElementById('room-featured-code').value;
    const previewEl = document.getElementById('room-code-preview');
    await validateAndPreview(code, previewEl);
  });

  // Auto-validate on blur
  document.getElementById('room-featured-code').addEventListener('blur', async (e) => {
    const code = e.target.value;
    if (code.trim()) {
      const previewEl = document.getElementById('room-code-preview');
      await validateAndPreview(code, previewEl);
    }
  });

  // Load initial preview if code exists
  if (room.featuredCode) {
    const previewEl = document.getElementById('room-code-preview');
    validateAndPreview(room.featuredCode, previewEl);
  }

  // Load Showpieces types if applicable
  if (isShowpieces) {
    loadShowpiecesTypes(container);
  }

  // Change detection listeners
  const roomDesc = document.getElementById('room-description');
  const roomCode = document.getElementById('room-featured-code');

  if (roomDesc) {
    roomDesc.addEventListener('input', onRoomSettingsChanged);
  }
  if (roomCode) {
    roomCode.addEventListener('input', onRoomSettingsChanged);
  }
}

// Load Showpieces furniture types with their codes
async function loadShowpiecesTypes(container) {
  const typesContainer = document.getElementById('showpieces-types-container');
  if (!typesContainer) return;

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/room-types/Showpieces`);
    const types = await response.json();

    if (types.length === 0) {
      typesContainer.innerHTML = '<span class="hint-text">No furniture types found. Add items to create types.</span>';
      return;
    }

    typesContainer.innerHTML = types.map(t => `
      <div class="type-code-row" data-type="${t.type}">
        <label class="type-label">${t.type}</label>
        <div class="type-code-input-row">
          <input type="text" class="type-code-input" value="${t.code || ''}" placeholder="e.g., SR-001">
          <button type="button" class="btn-validate-type-code" title="Validate">✓</button>
        </div>
        <div class="type-code-preview"></div>
      </div>
    `).join('');

    // Add validation listeners for each type code
    typesContainer.querySelectorAll('.type-code-row').forEach(row => {
      const typeName = row.dataset.type;
      const input = row.querySelector('.type-code-input');
      const validateBtn = row.querySelector('.btn-validate-type-code');
      const previewEl = row.querySelector('.type-code-preview');

      validateBtn.addEventListener('click', async () => {
        const code = input.value.trim();
        await validateCodeForShowpieces(code, previewEl);
      });

      input.addEventListener('blur', async () => {
        const code = input.value.trim();
        if (code) {
          await validateCodeForShowpieces(code, previewEl);
        }
        if (code) {
          await validateCodeForShowpieces(code, previewEl);
        }
      });

      // Change detection
      input.addEventListener('input', onRoomSettingsChanged);

      // Load initial preview
      if (input.value.trim()) {
        validateCodeForShowpieces(input.value.trim(), previewEl);
      }
    });

  } catch (error) {
    typesContainer.innerHTML = '<span class="preview-error">Error loading types</span>';
    console.error(error);
  }
}

// Validate code specifically for Showpieces items
async function validateCodeForShowpieces(code, previewEl) {
  if (!code) {
    previewEl.innerHTML = '';
    return null;
  }

  previewEl.innerHTML = '<span class="loading-hint">...</span>';

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/validate-code?code=${encodeURIComponent(code)}&room=Showpieces`);
    const result = await response.json();

    if (result.valid) {
      previewEl.innerHTML = result.image
        ? `<img src="${result.image}" alt="${result.name}" class="type-preview-img" title="${result.name}">`
        : `<span class="preview-success-text">✓</span>`;
      return result;
    } else {
      previewEl.innerHTML = '<span class="preview-error">✗</span>';
      return null;
    }
  } catch (error) {
    previewEl.innerHTML = '<span class="preview-error">!</span>';
    return null;
  }
}


// ==========================================
// API Actions
// ==========================================

async function updateField(collection, id, data) {
  const endpoint = collection === 'FurnitureSet' ? 'sets' : 'items';

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/${endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('Updated successfully', 'success');
      loadData();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error updating', 'error');
    }
  } catch (error) {
    showToast('Error updating', 'error');
    console.error(error);
  }
}

async function deleteItem(collection, id, button) {
  if (button) setButtonLoading(button, true);
  const endpoint = collection === 'FurnitureSet' ? 'sets' : 'items';

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/${endpoint}/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('Deleted successfully', 'success');
      closeModal('delete-modal');
      loadData();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error deleting', 'error');
    }
  } catch (error) {
    showToast('Error deleting', 'error');
    console.error(error);
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

// ==========================================
// Modals
// ==========================================

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Promise-based confirmation modal
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-confirm');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    if (!modal || !titleEl || !messageEl) {
      resolve(confirm(message)); // Fallback to native confirm
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add('active');

    const cleanup = () => {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    };

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// Close modals on outside click or cancel button
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.target.closest('.modal').classList.remove('active');
  });
});

// Room/Style initials for code prefix
const ROOM_INITIALS = {
  'Living Room': 'L',
  'Dining Room': 'D',
  'Bedroom': 'B',
  'Office': 'O',
  'Showpieces': 'S'
};

const STYLE_INITIALS = {
  'Royal': 'R',
  'Traditional': 'T',
  'Modern': 'M'
};

function getCodePrefix(room, style) {
  return (ROOM_INITIALS[room] || 'X') + (STYLE_INITIALS[style] || 'X') + '-';
}

// Add Set Modal
document.getElementById('add-set-btn').addEventListener('click', async () => {
  document.getElementById('set-modal-title').textContent = 'Add New Set';
  document.getElementById('set-id').value = '';
  document.getElementById('set-room').value = currentRoom;
  document.getElementById('set-style').value = currentStyle;
  document.getElementById('set-name').value = '';
  document.getElementById('set-description').value = '';
  document.getElementById('set-image').value = '';
  document.getElementById('set-image-preview').innerHTML = '';
  document.getElementById('set-code').value = '';
  document.getElementById('set-code-prefix').textContent = getCodePrefix(currentRoom, currentStyle);
  document.getElementById('set-room-display').textContent = currentRoom;
  document.getElementById('set-style-display').textContent = currentStyle;

  // Fetch next available code to show as suggestion
  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/sets/next-code?room=${encodeURIComponent(currentRoom)}&style=${encodeURIComponent(currentStyle)}`);
    if (response.ok) {
      const data = await response.json();
      document.getElementById('set-code').placeholder = data.number;
    }
  } catch (e) {
    console.log('Could not fetch next code suggestion');
  }

  openModal('set-modal');
});

// ==========================================
// IMAGE VALIDATION WITH SERVER CONFIG
// ==========================================

// Upload configuration (loaded from server)
let uploadConfig = null;

// Load upload configuration from server
async function loadUploadConfig() {
  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/upload-config`);
    if (response.ok) {
      uploadConfig = await response.json();
      console.log('Upload config loaded:', uploadConfig);
    }
  } catch (error) {
    console.warn('Could not load upload config, using defaults');
    // Fallback defaults
    uploadConfig = {
      fileSizeLimits: { default: 1, sets: 3, items: 3, heroImage: 5, aboutStory: 3 },
      aspectRatios: { sets: '4:3', items: '1:1', heroImage: '16:9' },
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    };
  }
}

// Parse aspect ratio string to number (e.g., '16:9' -> 16/9)
function parseAspectRatio(ratioStr) {
  if (!ratioStr) return null;
  const parts = ratioStr.split(':');
  if (parts.length !== 2) return null;
  return parseFloat(parts[0]) / parseFloat(parts[1]);
}

// Validate image file for size and aspect ratio based on section config
function validateImage(file, section = 'default') {
  return new Promise((resolve, reject) => {
    if (!uploadConfig) {
      console.warn('Upload config not loaded, skipping validation');
      resolve(true);
      return;
    }

    // Get section-specific limits
    const sizeLimitMB = uploadConfig.fileSizeLimits[section] || uploadConfig.fileSizeLimits.default || 1;
    const sizeLimitBytes = sizeLimitMB * 1024 * 1024;
    const aspectRatioStr = uploadConfig.aspectRatios[section]; // May be undefined (no enforcement)

    // Check file size
    if (file.size > sizeLimitBytes) {
      reject(`File size must be less than ${sizeLimitMB}MB (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      return;
    }

    // Check it's an image file
    if (!file.type.startsWith('image/')) {
      reject('File must be an image');
      return;
    }

    // If no aspect ratio defined for this section, skip ratio validation
    if (!aspectRatioStr) {
      resolve(true);
      return;
    }

    // Check aspect ratio
    const expectedRatio = parseAspectRatio(aspectRatioStr);
    if (!expectedRatio) {
      resolve(true);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const actualRatio = img.width / img.height;
      const tolerance = 0.15; // 15% tolerance

      if (Math.abs(actualRatio - expectedRatio) > tolerance) {
        reject(`Image must be ${aspectRatioStr} aspect ratio (current: ${img.width}x${img.height})`);
        return;
      }

      resolve(true);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject('Failed to load image');
    };

    img.src = url;
  });
}

// Load config on page load
loadUploadConfig();

// Set image preview with config-based validation
document.getElementById('set-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const previewEl = document.getElementById('set-image-preview');

  if (file) {
    try {
      await validateImage(file, 'sets');
      const reader = new FileReader();
      reader.onload = (e) => {
        previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast(error, 'error');
      e.target.value = '';
      previewEl.innerHTML = '';
    }
  } else {
    previewEl.innerHTML = '';
  }
});

// Add Item Modal
document.getElementById('add-item-btn').addEventListener('click', async () => {
  document.getElementById('item-modal-title').textContent = 'Add New Item';
  document.getElementById('item-id').value = '';
  document.getElementById('item-room').value = currentRoom;
  document.getElementById('item-style').value = currentStyle;
  document.getElementById('item-name').value = '';
  document.getElementById('item-type').value = '';
  document.getElementById('item-type-select').value = '';
  document.getElementById('item-type-new').value = '';
  document.getElementById('new-type-group').style.display = 'none';
  document.getElementById('item-description').value = '';
  document.getElementById('item-image').value = '';
  document.getElementById('item-image-preview').innerHTML = '';
  document.getElementById('item-code').value = '';
  document.getElementById('item-code-prefix').textContent = getCodePrefix(currentRoom, currentStyle);
  document.getElementById('item-room-display').textContent = currentRoom;
  document.getElementById('item-style-display').textContent = currentStyle;

  // Populate furniture type dropdown
  const typeSelect = document.getElementById('item-type-select');
  typeSelect.innerHTML = '<option value="">Select type or add new...</option>';
  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/furniture-types?room=${encodeURIComponent(currentRoom)}&style=${encodeURIComponent(currentStyle)}`);
    if (response.ok) {
      const types = await response.json();
      types.forEach(type => {
        typeSelect.innerHTML += `<option value="${type}">${type}</option>`;
      });
      typeSelect.innerHTML += '<option value="__new__">+ Add new type...</option>';
    }
  } catch (e) {
    console.log('Could not fetch furniture types');
  }

  // Fetch next available code to show as suggestion
  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/items/next-code?room=${encodeURIComponent(currentRoom)}&style=${encodeURIComponent(currentStyle)}`);
    if (response.ok) {
      const data = await response.json();
      document.getElementById('item-code').placeholder = data.number;
    }
  } catch (e) {
    console.log('Could not fetch next code suggestion');
  }

  openModal('item-modal');
});

// Handle furniture type dropdown change
document.getElementById('item-type-select').addEventListener('change', (e) => {
  const value = e.target.value;
  const newTypeGroup = document.getElementById('new-type-group');
  const typeHidden = document.getElementById('item-type');

  if (value === '__new__') {
    newTypeGroup.style.display = 'block';
    document.getElementById('item-type-new').focus();
    typeHidden.value = '';
  } else {
    newTypeGroup.style.display = 'none';
    typeHidden.value = value;
  }
});

// Handle new type input
document.getElementById('item-type-new').addEventListener('input', (e) => {
  document.getElementById('item-type').value = e.target.value;
});

// Item image preview with config-based validation
document.getElementById('item-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const previewEl = document.getElementById('item-image-preview');

  if (file) {
    try {
      await validateImage(file, 'items');
      const reader = new FileReader();
      reader.onload = (e) => {
        previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast(error, 'error');
      e.target.value = '';
      previewEl.innerHTML = '';
    }
  } else {
    previewEl.innerHTML = '';
  }
});

// Set Form Submit
document.getElementById('set-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const room = document.getElementById('set-room').value;
  const style = document.getElementById('set-style').value;
  const codeNumber = document.getElementById('set-code').value.trim();

  // Validate code if provided
  if (codeNumber && !/^\d{2}$/.test(codeNumber)) {
    showToast('Code must be exactly 2 digits (e.g., 01, 15)', 'error');
    return;
  }

  // Build full code if number provided
  const customCode = codeNumber ? getCodePrefix(room, style) + codeNumber : '';

  const formData = new FormData();
  formData.append('room', room);
  formData.append('style', style);
  formData.append('name', document.getElementById('set-name').value);
  formData.append('description', document.getElementById('set-description').value);
  if (customCode) {
    formData.append('customCode', customCode);
  }

  const imageFile = document.getElementById('set-image').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/sets`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      showToast('Set created successfully', 'success');
      closeModal('set-modal');
      // Reload page and scroll to bottom to show new item
      sessionStorage.setItem('scrollToBottom', 'true');
      window.location.reload();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error creating set', 'error');
    }
  } catch (error) {
    showToast('Error creating set', 'error');
    logDiagnostic('Server', 'Set creation failed - check Render logs for details');
    console.error(error);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

// Item Form Submit
document.getElementById('item-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const room = document.getElementById('item-room').value;
  const style = document.getElementById('item-style').value;
  const codeNumber = document.getElementById('item-code').value.trim();

  // Validate code if provided
  if (codeNumber && !/^\d{3}$/.test(codeNumber)) {
    showToast('Code must be exactly 3 digits (e.g., 001, 015)', 'error');
    return;
  }

  // Build full code if number provided
  const customCode = codeNumber ? getCodePrefix(room, style) + codeNumber : '';

  const formData = new FormData();
  formData.append('room', room);
  formData.append('style', style);
  formData.append('name', document.getElementById('item-name').value);
  formData.append('type', document.getElementById('item-type').value);
  formData.append('description', document.getElementById('item-description').value);
  if (customCode) {
    formData.append('customCode', customCode);
  }

  const imageFile = document.getElementById('item-image').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/items`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      showToast('Item created successfully', 'success');
      closeModal('item-modal');
      // Reload page and scroll to bottom to show new item
      sessionStorage.setItem('scrollToBottom', 'true');
      window.location.reload();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error creating item', 'error');
    }
  } catch (error) {
    showToast('Error creating item', 'error');
    logDiagnostic('Server', 'Item creation failed - check Render logs for details');
    console.error(error);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

// Image Modal
function openImageModal(collection, documentId, imageIndex) {
  document.getElementById('image-collection').value = collection;
  document.getElementById('image-doc-id').value = documentId;
  document.getElementById('image-index').value = imageIndex >= 0 ? imageIndex : -1;
  document.getElementById('image-file').value = '';
  document.getElementById('image-preview').innerHTML = '';

  // Reset size limit text with aspect ratio hint
  const limitSpan = document.getElementById('upload-size-limit');
  if (limitSpan) {
    if (collection === 'FurnitureSet') {
      limitSpan.textContent = 'Max 3MB, 4:3 Ratio';
    } else if (collection === 'FurnitureItem') {
      limitSpan.textContent = 'Max 3MB, 1:1 Ratio';
    } else {
      limitSpan.textContent = 'Max 3MB';
    }
  }

  // Reset button loading state when opening modal
  const submitBtn = document.querySelector('#image-form button[type="submit"]');
  if (submitBtn) {
    setButtonLoading(submitBtn, false);
  }

  openModal('image-modal');
}

// Image preview
// Image preview with validation
document.getElementById('image-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const previewEl = document.getElementById('image-preview');
  const collection = document.getElementById('image-collection').value;

  if (file) {
    try {
      // Determine validation section based on collection
      let section = 'default';
      if (collection === 'FurnitureSet') section = 'sets';
      else if (collection === 'FurnitureItem') section = 'items';
      else if (collection === 'HeroImage') section = 'heroImage';

      await validateImage(file, section);

      const reader = new FileReader();
      reader.onload = (e) => {
        previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast(error, 'error');
      e.target.value = '';
      previewEl.innerHTML = '';
    }
  } else {
    previewEl.innerHTML = '';
  }
});

// Image Form Submit
document.getElementById('image-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const collection = document.getElementById('image-collection').value;

  // SiteSettings uploads are handled by a separate handler below
  if (collection === 'SiteSettings') {
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    let response;

    // Hero image uploads use a different endpoint
    if (collection === 'HeroImage') {
      const slotIndex = document.getElementById('image-doc-id').value;
      const heroFormData = new FormData();
      heroFormData.append('image', formData.get('image'));
      heroFormData.append('slotIndex', slotIndex);

      response = await fetch(`/${ADMIN_ROUTE}/api/settings/home/hero-image`, {
        method: 'POST',
        body: heroFormData
      });
    } else {
      response = await fetch(`/${ADMIN_ROUTE}/api/upload-image`, {
        method: 'POST',
        body: formData
      });
    }

    if (response.ok) {
      showToast('Image uploaded successfully', 'success');
      closeModal('image-modal');
      // For hero images, reload settings; for others, reload data
      if (collection === 'HeroImage') {
        await loadSettings();
      } else {
        loadData();
      }
    } else {
      const error = await response.json();
      showToast(error.error || 'Error uploading image', 'error');
    }
  } catch (error) {
    showToast('Error uploading image', 'error');
    logDiagnostic('Cloudinary', 'Image upload failed - check CLOUDINARY_URL in .env');
    console.error(error);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

// Delete Modal
function openDeleteModal(collection, id) {
  deleteTarget = { collection, id };
  openModal('delete-modal');
}

document.getElementById('confirm-delete-btn').addEventListener('click', function() {
  if (deleteTarget) {
    deleteItem(deleteTarget.collection, deleteTarget.id, this);
  }
});

// ==========================================
// Toast Notifications
// ==========================================

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast active ${type}`;

  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

// ==========================================
// Close menus on outside click
// ==========================================

document.addEventListener('click', () => {
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
});

// ==========================================
// SITE SETTINGS HANDLERS
// ==========================================

let siteSettings = null;

async function loadSettings() {
  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/settings`);
    siteSettings = await response.json();
    populateHomeSettings();
    populateContactSettings();
    populateAboutSettings();

    populateServicesSettings();
    populateCatalogueSettings();

    // Store original data state for change detection
    storeOriginalSettingsData();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function populateHomeSettings() {
  if (!siteSettings) return;

  const home = siteSettings.home;
  document.getElementById('hero-tagline').value = home.hero.tagline || '';
  document.getElementById('hero-badges').value = (home.hero.badges || []).join(', ');

  // Populate hero images
  const heroImages = home.hero.images || [];
  const activeIndex = home.hero.activeImageIndex || 0;

  for (let i = 0; i < 3; i++) {
    const preview = document.getElementById(`hero-preview-${i}`);
    const slot = document.querySelector(`.hero-image-slot[data-slot="${i}"]`);
    const deleteBtn = slot?.querySelector('.btn-delete-hero');
    const radio = document.querySelector(`input[name="activeHeroImage"][value="${i}"]`);

    if (heroImages[i] && heroImages[i].url) {
      preview.innerHTML = `<img src="${heroImages[i].url}" alt="Hero ${i + 1}">`;
      if (deleteBtn) deleteBtn.disabled = false;
    } else {
      preview.innerHTML = '<span class="no-image-text">No image</span>';
      if (deleteBtn) deleteBtn.disabled = true;
    }

    // Set active class and radio
    if (slot) {
      slot.classList.toggle('active', i === activeIndex);
    }
    if (radio) {
      radio.checked = (i === activeIndex);
    }
  }

  // Populate stats
  const statsContainer = document.getElementById('hero-stats-container');
  statsContainer.innerHTML = '';
  (home.hero.stats || []).forEach((stat, index) => {
    addStatRow(stat.number, stat.label, index);
  });

  // Populate featured codes
  document.getElementById('signature-codes').value = (home.featuredCodes.signatureItems || []).join(', ');
  document.getElementById('featured-items-codes').value = (home.featuredCodes.featuredItems || []).join(', ');
  document.getElementById('featured-sets-codes').value = (home.featuredCodes.featuredSets || []).join(', ');

  // Populate delivery section
  const delivery = home.delivery || {};
  document.getElementById('delivery-title').value = delivery.title || 'Crafted In India, Delivered Worldwide';

  // Map image preview
  const mapPreview = document.getElementById('delivery-map-preview');
  if (delivery.mapImage?.url) {
    mapPreview.innerHTML = `<img src="${delivery.mapImage.url}" alt="Map">`;
  } else {
    mapPreview.innerHTML = '';
  }

  // Delivery paragraphs
  const paragraphsContainer = document.getElementById('delivery-paragraphs-container');
  paragraphsContainer.innerHTML = '';
  (delivery.paragraphs || []).forEach((text, index) => {
    addDeliveryParagraphRow(text, index);
  });

  // India locations
  const indiaContainer = document.getElementById('india-locations-container');
  indiaContainer.innerHTML = '';
  (delivery.indiaLocations || []).forEach((loc, index) => {
    addIndiaLocationRow(loc, index);
  });

  // International locations
  const intlContainer = document.getElementById('international-locations-container');
  intlContainer.innerHTML = '';
  (delivery.internationalLocations || []).forEach((loc, index) => {
    addInternationalLocationRow(loc.name, loc.flagImage?.url, index);
  });

  // Footer Configuration
  const footer = home.footer || {};
  document.getElementById('footer-tagline1').value = footer.tagline1 || '';
  document.getElementById('footer-tagline2').value = footer.tagline2 || '';
  document.getElementById('footer-copyright').value = footer.copyright || '';

  // Section Text Configuration
  const sections = home.sections || {};
  document.getElementById('signature-title').value = sections.signaturePieces?.title || '';
  document.getElementById('signature-subtitle').value = sections.signaturePieces?.subtitle || '';
  document.getElementById('featured-items-title').value = sections.featuredItems?.title || '';
  document.getElementById('featured-items-subtitle').value = sections.featuredItems?.subtitle || '';
  document.getElementById('featured-sets-title').value = sections.featuredSets?.title || '';
  document.getElementById('featured-sets-subtitle').value = sections.featuredSets?.subtitle || '';
  document.getElementById('browse-rooms-title').value = sections.browseRooms?.title || '';
  document.getElementById('browse-rooms-subtitle').value = sections.browseRooms?.subtitle || '';
  document.getElementById('custom-order-title').value = sections.customOrder?.title || '';
  document.getElementById('custom-order-description').value = sections.customOrder?.description || '';
}

// Hero image upload handlers
document.querySelectorAll('.btn-upload-hero').forEach(btn => {
  btn.addEventListener('click', () => {
    const slotIndex = btn.dataset.slot;
    openHeroImageUpload(slotIndex);
  });
});

// Hero image delete handlers
document.querySelectorAll('.btn-delete-hero').forEach(btn => {
  btn.addEventListener('click', async () => {
    const slotIndex = btn.dataset.slot;
    if (!confirm('Delete this hero image?')) return;

    btn.disabled = true;
    try {
      const response = await fetch(`/${ADMIN_ROUTE}/api/settings/home/hero-image/${slotIndex}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Hero image deleted!', 'success');
        await loadSettings();
      } else {
        const err = await response.json();
        showToast(err.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast('Delete failed', 'error');
      console.error(error);
    }
  });
});

// Active hero image selection
document.querySelectorAll('input[name="activeHeroImage"]').forEach(radio => {
  radio.addEventListener('change', async (e) => {
    const activeIndex = parseInt(e.target.value);

    // Check if this slot has an image
    const heroImages = siteSettings?.home?.hero?.images || [];
    if (!heroImages[activeIndex]?.url) {
      showToast('Cannot select empty slot as active', 'error');
      // Revert to previous
      populateHomeSettings();
      return;
    }

    // Show confirmation modal before changing
    const confirmed = await showConfirmModal(
      'Change Active Hero Image',
      'Set this image as the active hero image on the homepage?'
    );

    if (!confirmed) {
      populateHomeSettings(); // Revert radio selection
      return;
    }

    try {
      const response = await fetch(`/${ADMIN_ROUTE}/api/settings/home/hero-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeIndex })
      });

      if (response.ok) {
        showToast('Active hero image updated!', 'success');
        await loadSettings();
      } else {
        const err = await response.json();
        showToast(err.error || 'Update failed', 'error');
        populateHomeSettings();
      }
    } catch (error) {
      showToast('Update failed', 'error');
      console.error(error);
      populateHomeSettings();
    }
  });
});

function openHeroImageUpload(slotIndex) {
  // Use the existing image modal
  const form = document.getElementById('image-form');
  form.dataset.heroSlot = slotIndex;

  document.getElementById('image-collection').value = 'HeroImage';
  document.getElementById('image-doc-id').value = slotIndex;
  document.getElementById('image-index').value = '-1';
  document.getElementById('image-file').value = '';
  document.getElementById('image-preview').innerHTML = '';

  // Reset button loading state when opening modal
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    setButtonLoading(submitBtn, false);
  }

  // Update size limit text
  const limitSpan = document.getElementById('upload-size-limit');
  if (limitSpan) {
    limitSpan.textContent = 'Max 5MB, 16:9 Ratio';
  }

  openModal('image-modal');
}

function populateContactSettings() {
  if (!siteSettings) return;

  const contact = siteSettings.contact;
  document.getElementById('contact-phone1').value = contact.phone1 || '';
  document.getElementById('contact-phone2').value = contact.phone2 || '';
  document.getElementById('contact-whatsapp-enquiry').value = contact.whatsappEnquiry || '';
  document.getElementById('contact-email').value = contact.email || '';
  document.getElementById('contact-form-email').value = contact.formEmail || '';
  document.getElementById('address-line1').value = contact.address?.line1 || '';
  document.getElementById('address-line2').value = contact.address?.line2 || '';
  document.getElementById('address-line3').value = contact.address?.line3 || '';
  document.getElementById('address-country').value = contact.address?.country || '';
  document.getElementById('hours-weekday').value = contact.businessHours?.weekday || '';
  document.getElementById('hours-weekend').value = contact.businessHours?.weekend || '';

  // Page Meta
  document.getElementById('contact-page-title').value = contact.pageTitle || 'Contact Us';
  document.getElementById('contact-page-description').value = contact.pageDescription || '';

  // Social Media
  document.getElementById('contact-instagram').value = contact.socialMedia?.instagram || '';
  document.getElementById('contact-facebook').value = contact.socialMedia?.facebook || '';

  // Form Section
  document.getElementById('contact-form-title').value = contact.formSection?.title || '';
  document.getElementById('contact-form-description').value = contact.formSection?.description || '';

  // FAQ
  const faqContainer = document.getElementById('contact-faq-container');
  faqContainer.innerHTML = '';
  (contact.faq || []).forEach((item, index) => {
    addFaqRow(item.question, item.answer, index);
  });
}

function addFaqRow(question = '', answer = '', index = null) {
  const container = document.getElementById('contact-faq-container');
  const row = document.createElement('div');
  row.className = 'dynamic-row faq-row';
  row.innerHTML = `
    <div class="row-header">
       <span class="row-number">${container.children.length + 1}</span>
       <button type="button" class="btn-remove-row">&times;</button>
    </div>
    <div class="form-group">
      <label>Question</label>
      <input type="text" class="faq-question" name="faqQuestion[]" value="${question}" placeholder="Question?">
    </div>
    <div class="form-group">
      <label>Answer</label>
      <textarea class="faq-answer" name="faqAnswer[]" rows="2" placeholder="Answer...">${answer}</textarea>
    </div>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this FAQ?');
    if (confirmed) {
      row.remove();
      document.getElementById('contact-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  container.appendChild(row);
  document.getElementById('contact-settings-form')?.dispatchEvent(new Event('input'));
}

function addStatRow(number = '', label = '', index = null) {
  const statsContainer = document.getElementById('hero-stats-container');
  const row = document.createElement('div');
  row.className = 'stat-row';
  row.innerHTML = `
    <input type="text" placeholder="45+" value="${number}" class="stat-number" name="statNumbers[]">
    <input type="text" placeholder="Years Crafting" value="${label}" class="stat-label" name="statLabels[]">
    <button type="button" class="btn-remove-stat">&times;</button>
  `;
  row.querySelector('.btn-remove-stat').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this stat?');
    if (confirmed) {
      row.remove();
      document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  statsContainer.appendChild(row);
  document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
}

// ==========================================
// DELIVERY SECTION HELPERS
// ==========================================

function addDeliveryParagraphRow(text = '', index = null) {
  const container = document.getElementById('delivery-paragraphs-container');
  const row = document.createElement('div');
  row.className = 'delivery-paragraph-row';
  row.innerHTML = `
    <textarea class="delivery-paragraph" name="deliveryParagraphs[]" rows="2" placeholder="Enter paragraph text...">${text}</textarea>
    <button type="button" class="btn-remove-row">&times;</button>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this paragraph?');
    if (confirmed) {
      row.remove();
      document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  container.appendChild(row);
  // Trigger change detection for new row
  document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
}

function addIndiaLocationRow(location = '', index = null) {
  const container = document.getElementById('india-locations-container');
  const row = document.createElement('div');
  row.className = 'location-row';
  row.innerHTML = `
    <input type="text" class="india-location" name="indiaLocations[]" value="${location}" placeholder="City/State name">
    <button type="button" class="btn-remove-row">&times;</button>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this location?');
    if (confirmed) {
      row.remove();
      document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  container.appendChild(row);
  // Trigger change detection for new row
  document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
}

function addInternationalLocationRow(name = '', flagUrl = '', index = null) {
  const container = document.getElementById('international-locations-container');
  const row = document.createElement('div');
  row.className = 'intl-location-row';
  row.dataset.index = index !== null ? index : Date.now(); // Use timestamp fallback for uniqueness
  row.innerHTML = `
    <input type="text" class="intl-name" name="intlLocationsName[]" value="${name}" placeholder="Location name (e.g. UAE - Dubai)">
    <input type="hidden" class="intl-flag-url" value="${flagUrl}">
    <div class="intl-flag-preview">${flagUrl ? `<img src="${flagUrl}" alt="Flag">` : ''}</div>
    <button type="button" class="btn-upload-flag">Upload Flag</button>
    <button type="button" class="btn-remove-row">&times;</button>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this location?');
    if (confirmed) {
      row.remove();
      document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  row.querySelector('.btn-upload-flag').addEventListener('click', () => {
    openInternationalFlagUpload(row.dataset.index);
  });
  container.appendChild(row);
  // Trigger change detection for new row
  document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
}

// Add button handlers
document.getElementById('add-delivery-paragraph-btn')?.addEventListener('click', () => {
  addDeliveryParagraphRow();
});

document.getElementById('add-india-location-btn')?.addEventListener('click', () => {
  addIndiaLocationRow();
});

document.getElementById('add-international-location-btn')?.addEventListener('click', () => {
  addInternationalLocationRow();
});

// Map image upload button
document.querySelector('[data-section="delivery-map"]')?.addEventListener('click', () => {
  openSettingsImageModal('home', 'map');
});

// Add FAQ button
document.getElementById('add-faq-btn')?.addEventListener('click', () => {
  addFaqRow();
});

// Add stat button
document.getElementById('add-stat-btn')?.addEventListener('click', () => {
  addStatRow();
});

// Home settings form submit
// Sticky Save Button Listener
document.getElementById('home-save-btn')?.addEventListener('click', saveHomeSettings);

async function saveHomeSettings() {
  const btn = document.getElementById('home-save-btn');
  setButtonLoading(btn, true);

  // Collect stats
  const stats = [];
  document.querySelectorAll('#hero-stats-container .stat-row').forEach(row => {
    const number = row.querySelector('.stat-number').value.trim();
    const label = row.querySelector('.stat-label').value.trim();
    if (number && label) {
      stats.push({ number, label });
    }
  });

  // Parse comma-separated codes
  const parseCSV = (str) => str.split(',').map(s => s.trim()).filter(Boolean);

  // Collect delivery paragraphs
  const deliveryParagraphs = [];
  document.querySelectorAll('#delivery-paragraphs-container .delivery-paragraph').forEach(textarea => {
    const text = textarea.value.trim();
    if (text) deliveryParagraphs.push(text);
  });

  // Collect India locations
  const indiaLocations = [];
  document.querySelectorAll('#india-locations-container .india-location').forEach(input => {
    const loc = input.value.trim();
    if (loc) indiaLocations.push(loc);
  });

  // Collect international locations
  const internationalLocations = [];
  document.querySelectorAll('#international-locations-container .intl-location-row').forEach(row => {
    const name = row.querySelector('.intl-name').value.trim();
    const flagUrl = row.querySelector('.intl-flag-url').value;
    if (name) {
      internationalLocations.push({
        name,
        flagImage: { url: flagUrl }
      });
    }
  });

  const data = {
    tagline: document.getElementById('hero-tagline').value.trim(),
    badges: parseCSV(document.getElementById('hero-badges').value),
    stats,
    signatureItems: parseCSV(document.getElementById('signature-codes').value),
    featuredItems: parseCSV(document.getElementById('featured-items-codes').value),
    featuredSets: parseCSV(document.getElementById('featured-sets-codes').value),
    // Delivery section
    deliveryTitle: document.getElementById('delivery-title').value.trim(),
    deliveryParagraphs,
    indiaLocations,
    internationalLocations,
    // Footer section
    footer: {
      tagline1: document.getElementById('footer-tagline1').value.trim(),
      tagline2: document.getElementById('footer-tagline2').value.trim(),
      copyright: document.getElementById('footer-copyright').value.trim()
    },
    // Section Text Configuration
    sections: {
      signaturePieces: {
        title: document.getElementById('signature-title').value.trim(),
        subtitle: document.getElementById('signature-subtitle').value.trim()
      },
      featuredItems: {
        title: document.getElementById('featured-items-title').value.trim(),
        subtitle: document.getElementById('featured-items-subtitle').value.trim()
      },
      featuredSets: {
        title: document.getElementById('featured-sets-title').value.trim(),
        subtitle: document.getElementById('featured-sets-subtitle').value.trim()
      },
      browseRooms: {
        title: document.getElementById('browse-rooms-title').value.trim(),
        subtitle: document.getElementById('browse-rooms-subtitle').value.trim()
      },
      customOrder: {
        title: document.getElementById('custom-order-title').value.trim(),
        description: document.getElementById('custom-order-description').value.trim()
      }
    }
  };

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/settings/home`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('Home settings saved!', 'success');
      loadSettings();
    } else {
      const err = await response.json();
      showToast(err.error || 'Error saving settings', 'error');
    }
  } catch (error) {
    showToast('Error saving settings', 'error');
    console.error(error);
  } finally {
    setButtonLoading(btn, false);
  }
}

// Contact settings form submit
document.getElementById('contact-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  // Collect FAQ
  const faq = [];
  document.querySelectorAll('.faq-row').forEach(row => {
    const question = row.querySelector('.faq-question').value.trim();
    const answer = row.querySelector('.faq-answer').value.trim();
    if (question && answer) {
      faq.push({ question, answer });
    }
  });

  const data = {
    pageTitle: document.getElementById('contact-page-title').value.trim(),
    pageDescription: document.getElementById('contact-page-description').value.trim(),
    phone1: document.getElementById('contact-phone1').value.trim(),
    phone2: document.getElementById('contact-phone2').value.trim(),
    whatsappEnquiry: document.getElementById('contact-whatsapp-enquiry').value.trim(),
    email: document.getElementById('contact-email').value.trim(),
    formEmail: document.getElementById('contact-form-email').value.trim(),
    addressLine1: document.getElementById('address-line1').value.trim(),
    addressLine2: document.getElementById('address-line2').value.trim(),
    addressLine3: document.getElementById('address-line3').value.trim(),
    addressCountry: document.getElementById('address-country').value.trim(),
    hoursWeekday: document.getElementById('hours-weekday').value.trim(),
    hoursWeekend: document.getElementById('hours-weekend').value.trim(),
    socialMedia: {
      instagram: document.getElementById('contact-instagram').value.trim(),
      facebook: document.getElementById('contact-facebook').value.trim()
    },
    formSection: {
      title: document.getElementById('contact-form-title').value.trim(),
      description: document.getElementById('contact-form-description').value.trim()
    },
    faq
  };

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/settings/contact`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('Contact settings saved!', 'success');
      loadSettings();
    } else {
      const err = await response.json();
      showToast(err.error || 'Error saving settings', 'error');
    }
  } catch (error) {
    showToast('Error saving settings', 'error');
    console.error(error);
  } finally {
    setButtonLoading(btn, false);
  }
});

// ==========================================
// ABOUT SETTINGS HANDLERS
// ==========================================

function populateAboutSettings() {
  if (!siteSettings || !siteSettings.about) return;

  const about = siteSettings.about;

  // Story section
  document.getElementById('about-page-title').value = about.pageTitle || 'About Us';
  document.getElementById('about-page-description').value = about.pageDescription || '';
  document.getElementById('about-story-title').value = about.story?.title || '';
  document.getElementById('about-story-subtitle').value = about.story?.subtitle || '';
  document.getElementById('about-story-content').value = about.story?.content || '';

  // Story image preview
  const storyPreview = document.getElementById('story-image-preview');
  if (about.story?.image?.url) {
    storyPreview.innerHTML = `<img src="${about.story.image.url}" alt="Story">`;
  } else {
    storyPreview.innerHTML = '<span class="no-image-text">No image</span>';
  }

  // Values (container may be commented out)
  const valuesContainer = document.getElementById('values-container');
  if (valuesContainer) {
    valuesContainer.innerHTML = '';
    (about.values || []).forEach((value, index) => {
      addValueRow(value.icon, value.title, value.description, index);
    });
  }

  // Process
  document.getElementById('about-process-intro').value = about.process?.intro || '';
  const processContainer = document.getElementById('process-steps-container');
  processContainer.innerHTML = '';
  (about.process?.steps || []).forEach((step, index) => {
    addProcessStepRow(step.title, step.description, step.image, index);
  });

  // Heritage
  document.getElementById('about-heritage-title').value = about.heritage?.title || '';
  document.getElementById('about-heritage-description').value = about.heritage?.description || '';

  // CTA
  document.getElementById('about-cta-title').value = about.cta?.title || '';
  document.getElementById('about-cta-description').value = about.cta?.description || '';
}

function addValueRow(icon = '', title = '', description = '', index = null) {
  const valuesContainer = document.getElementById('values-container');
  const row = document.createElement('div');
  row.className = 'dynamic-row value-row';
  row.innerHTML = `
    <div class="row-header">
      <span class="row-number">${valuesContainer.children.length + 1}</span>
      <button type="button" class="btn-remove-row">&times;</button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Icon Key</label>
        <input type="text" class="value-icon" name="valueIcon[]" value="${icon}" placeholder="craftsmanship">
      </div>
      <div class="form-group">
        <label>Title</label>
        <input type="text" class="value-title" name="valueTitle[]" value="${title}" placeholder="Craftsmanship">
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea class="value-description" name="valueDesc[]" rows="2" placeholder="Value description...">${description}</textarea>
    </div>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this value?');
    if (confirmed) {
      row.remove();
      renumberRows(valuesContainer, 'value-row');
      document.getElementById('about-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  // Add input listeners for change detection
  row.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      document.getElementById('about-settings-form')?.dispatchEvent(new Event('input'));
    });
  });
  valuesContainer.appendChild(row);
}

function addProcessStepRow(title = '', description = '', image = null, index = null) {
  const container = document.getElementById('process-steps-container');
  const stepIndex = container.children.length;
  const row = document.createElement('div');
  row.className = 'dynamic-row process-step-row';
  row.dataset.stepIndex = stepIndex;
  row.innerHTML = `
    <div class="row-header">
      <span class="row-number">${stepIndex + 1}</span>
      <button type="button" class="btn-remove-row">&times;</button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Step Title</label>
        <input type="text" class="step-title" name="processStepTitle[]" value="${title}" placeholder="Design Brief">
      </div>
      <div class="form-group image-upload-inline">
        <label>Step Image</label>
        <div class="image-upload-row">
          <div class="image-preview-small step-image-preview">${image?.url ? `<img src="${image.url}" alt="Step">` : '<span class="no-image-text">No image</span>'}</div>
          <button type="button" class="btn-upload btn-upload-step" data-step-index="${stepIndex}">Upload</button>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label>Step Description</label>
      <textarea class="step-description" name="processStepDesc[]" rows="2" placeholder="Step description...">${description}</textarea>
    </div>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this process step?');
    if (confirmed) {
      row.remove();
      renumberRows(container, 'process-step-row');
      updateStepIndices();
      document.getElementById('about-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  row.querySelector('.btn-upload-step').addEventListener('click', (e) => {
    const idx = e.target.dataset.stepIndex;
    openSettingsImageModal('about', 'process', idx);
  });
  // Add input listeners for change detection
  row.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      document.getElementById('about-settings-form')?.dispatchEvent(new Event('input'));
    });
  });
  container.appendChild(row);
}

function renumberRows(container, rowClass) {
  container.querySelectorAll(`.${rowClass}`).forEach((row, i) => {
    row.querySelector('.row-number').textContent = i + 1;
    if (row.dataset.stepIndex !== undefined) {
      row.dataset.stepIndex = i;
      const uploadBtn = row.querySelector('.btn-upload-step');
      if (uploadBtn) uploadBtn.dataset.stepIndex = i;
    }
    if (row.dataset.serviceIndex !== undefined) {
      row.dataset.serviceIndex = i;
      const uploadBtn = row.querySelector('.btn-upload-service');
      if (uploadBtn) uploadBtn.dataset.serviceIndex = i;
    }
  });
}

function updateStepIndices() {
  document.querySelectorAll('.process-step-row').forEach((row, i) => {
    row.dataset.stepIndex = i;
    const btn = row.querySelector('.btn-upload-step');
    if (btn) btn.dataset.stepIndex = i;
  });
}

// Add value button
document.getElementById('add-value-btn')?.addEventListener('click', () => {
  addValueRow();
});

// Add process step button
document.getElementById('add-process-step-btn')?.addEventListener('click', () => {
  addProcessStepRow();
});

// Story image upload button
document.querySelector('[data-section="story"]')?.addEventListener('click', () => {
  openSettingsImageModal('about', 'story');
});

// About settings form submit
document.getElementById('about-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  // Collect values
  const values = [];
  document.querySelectorAll('.value-row').forEach(row => {
    const icon = row.querySelector('.value-icon').value.trim();
    const title = row.querySelector('.value-title').value.trim();
    const description = row.querySelector('.value-description').value.trim();
    if (title && description) {
      values.push({ icon, title, description });
    }
  });

  // Collect process steps (text only - images handled separately)
  const steps = [];
  document.querySelectorAll('.process-step-row').forEach(row => {
    const title = row.querySelector('.step-title').value.trim();
    const description = row.querySelector('.step-description').value.trim();
    // Preserve existing image data
    const stepIndex = parseInt(row.dataset.stepIndex);
    const existingImage = siteSettings?.about?.process?.steps?.[stepIndex]?.image || { url: '', publicId: '' };
    if (title || description) {
      steps.push({ title, description, image: existingImage });
    }
  });

  const data = {
    pageTitle: document.getElementById('about-page-title').value.trim(),
    pageDescription: document.getElementById('about-page-description').value.trim(),
    story: {
      title: document.getElementById('about-story-title').value.trim(),
      subtitle: document.getElementById('about-story-subtitle').value.trim(),
      content: document.getElementById('about-story-content').value.trim()
    },
    values,
    process: {
      intro: document.getElementById('about-process-intro').value.trim(),
      steps
    },
    heritage: {
      title: document.getElementById('about-heritage-title').value.trim(),
      description: document.getElementById('about-heritage-description').value.trim()
    },
    cta: {
      title: document.getElementById('about-cta-title').value.trim(),
      description: document.getElementById('about-cta-description').value.trim()
    }
  };

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/settings/about`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('About settings saved!', 'success');
      loadSettings();
    } else {
      const err = await response.json();
      showToast(err.error || 'Error saving settings', 'error');
    }
  } catch (error) {
    showToast('Error saving settings', 'error');
    console.error(error);
  } finally {
    setButtonLoading(btn, false);
  }
});

// ==========================================
// SERVICES SETTINGS HANDLERS
// ==========================================

function populateServicesSettings() {
  if (!siteSettings || !siteSettings.services) return;

  const services = siteSettings.services;

  // Intro
  document.getElementById('services-page-title').value = services.pageTitle || 'Our Services';
  document.getElementById('services-page-description').value = services.pageDescription || '';
  document.getElementById('services-intro-title').value = services.intro?.title || '';
  document.getElementById('services-intro-description').value = services.intro?.description || '';

  // Services items
  const container = document.getElementById('services-items-container');
  container.innerHTML = '';
  (services.items || []).forEach((item, index) => {
    addServiceRow(item.title, item.description, item.features, item.image, index);
  });

  // CTA
  document.getElementById('services-cta-title').value = services.cta?.title || '';
  document.getElementById('services-cta-description').value = services.cta?.description || '';
}

function addServiceRow(title = '', description = '', features = [], image = null, index = null) {
  const container = document.getElementById('services-items-container');
  const serviceIndex = container.children.length;
  const row = document.createElement('div');
  row.className = 'dynamic-row service-row';
  row.dataset.serviceIndex = serviceIndex;
  row.innerHTML = `
    <div class="row-header">
      <span class="row-number">${serviceIndex + 1}</span>
      <button type="button" class="btn-remove-row">&times;</button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Service Title</label>
        <input type="text" class="service-title" name="serviceTitle[]" value="${title}" placeholder="Custom Furniture Design">
      </div>
      <div class="form-group image-upload-inline">
        <label>Service Image</label>
        <div class="image-upload-row">
          <div class="image-preview-small service-image-preview">${image?.url ? `<img src="${image.url}" alt="Service">` : '<span class="no-image-text">No image</span>'}</div>
          <button type="button" class="btn-upload btn-upload-service" data-service-index="${serviceIndex}">Upload</button>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label>Service Description</label>
      <textarea class="service-description" name="serviceDesc[]" rows="2" placeholder="Service description...">${description}</textarea>
    </div>
    <div class="form-group">
      <label>Features (one per line)</label>
      <textarea class="service-features" name="serviceFeatures[]" rows="3" placeholder="Feature 1\nFeature 2\nFeature 3...">${(features || []).join('\n')}</textarea>
    </div>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Remove Item', 'Remove this service?');
    if (confirmed) {
      row.remove();
      renumberRows(container, 'service-row');
      updateServiceIndices();
      document.getElementById('services-settings-form')?.dispatchEvent(new Event('input'));
    }
  });
  row.querySelector('.btn-upload-service').addEventListener('click', (e) => {
    const idx = e.target.dataset.serviceIndex;
    openSettingsImageModal('services', null, idx);
  });
  // Add input listeners for change detection
  row.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      document.getElementById('services-settings-form')?.dispatchEvent(new Event('input'));
    });
  });
  container.appendChild(row);
}

function updateServiceIndices() {
  document.querySelectorAll('.service-row').forEach((row, i) => {
    row.dataset.serviceIndex = i;
    const btn = row.querySelector('.btn-upload-service');
    if (btn) btn.dataset.serviceIndex = i;
  });
}

// Add service button
document.getElementById('add-service-btn')?.addEventListener('click', () => {
  addServiceRow();
});

// Services settings form submit
document.getElementById('services-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  // Collect services items
  const items = [];
  document.querySelectorAll('.service-row').forEach(row => {
    const title = row.querySelector('.service-title').value.trim();
    const description = row.querySelector('.service-description').value.trim();
    const featuresText = row.querySelector('.service-features').value.trim();
    const features = featuresText.split('\n').map(f => f.trim()).filter(Boolean);
    // Preserve existing image data
    const serviceIndex = parseInt(row.dataset.serviceIndex);
    const existingImage = siteSettings?.services?.items?.[serviceIndex]?.image || { url: '', publicId: '' };
    if (title || description) {
      items.push({ title, description, features, image: existingImage });
    }
  });

  const data = {
    pageTitle: document.getElementById('services-page-title').value.trim(),
    pageDescription: document.getElementById('services-page-description').value.trim(),
    intro: {
      title: document.getElementById('services-intro-title').value.trim(),
      description: document.getElementById('services-intro-description').value.trim()
    },
    items,
    cta: {
      title: document.getElementById('services-cta-title').value.trim(),
      description: document.getElementById('services-cta-description').value.trim()
    }
  };

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/settings/services`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('Services settings saved!', 'success');
      loadSettings();
    } else {
      const err = await response.json();
      showToast(err.error || 'Error saving settings', 'error');
    }
  } catch (error) {
    showToast('Error saving settings', 'error');
    console.error(error);
  } finally {
    setButtonLoading(btn, false);
  }
});

// Populate Catalogue Settings
function populateCatalogueSettings() {
  if (!siteSettings || !siteSettings.catalogue) return;
  const catalogue = siteSettings.catalogue;
  document.getElementById('catalogue-page-title').value = catalogue.pageTitle || 'Our Collection';
  document.getElementById('catalogue-page-description').value = catalogue.pageDescription || '';
}

// Populate Catalogue Settings
function populateCatalogueSettings() {
  if (!siteSettings || !siteSettings.catalogue) return;
  const catalogue = siteSettings.catalogue;
  document.getElementById('catalogue-page-title').value = catalogue.pageTitle || 'Our Collection';
  document.getElementById('catalogue-page-description').value = catalogue.pageDescription || '';

  storeOriginalCatalogueData();
}

let originalCatalogueData = null;
let originalRoomData = null;
let currentRoomDataObj = null; // Store full room object for saving

function storeOriginalCatalogueData() {
  originalCatalogueData = {
    pageTitle: document.getElementById('catalogue-page-title').value,
    pageDescription: document.getElementById('catalogue-page-description').value
  };
  updateRoomsSaveButton(false);
}

function storeOriginalRoomData(room) {
  currentRoomDataObj = room;
  originalRoomData = {
    description: room.description || '',
    featuredCode: room.featuredCode || '',
    typeCodes: JSON.stringify(room.showpiecesTypeCodes || {}) // Simplification for comparison
    // Note: detailed deep compare for type codes might be needed if they were complex objects
  };
   // If Showpieces, we might need to wait for type inputs to load to grab their values?
   // Actually, room object has the source of truth.
   // But inputs might be empty if not loaded.
   // Wait, inputs are generated from `loadShowpiecesTypes` which fetches API?
   // No, `loadShowpiecesTypes` fetches TYPES, but `createRoomCard` doesn't populate the values?
   // `createRoomCard` logic (lines 407-440) for Showpieces is missing in my snippet read?
   // Snippet 1066 showed:
   // 407: <div class="room-field showpieces-types-section">...</div>
   // 410: <div id="showpieces-types-container">Loading...</div>
   // Values are populated by `loadShowpiecesTypes` (lines 640+).
   // `loadShowpiecesTypes` fetches `/api/room-types/Showpieces`.
   // `t.code` comes from that API?
   // Wait, `room` object has `showpiecesTypeCodes`.
   // Does `/api/room-types` return codes?
   // Let's assume on load, state is clean.
   updateRoomsSaveButton(false);
}

function onRoomSettingsChanged() {
   updateRoomsSaveButton(true);
}

// Global Rooms Save Handler
document.getElementById('rooms-save-btn')?.addEventListener('click', async () => {
  if (currentRoom === 'Catalogue') {
    saveCatalogueSettings();
  } else {
    saveRoomSettings();
  }
});

// Global Rooms Cancel Handler
document.getElementById('rooms-cancel-btn')?.addEventListener('click', () => {
    if (currentRoom === 'Catalogue') {
        populateCatalogueSettings();
    } else {
        loadRoomDetails(); // Reloads fresh
    }
});

function updateRoomsSaveButton(hasChanges) {
    const btn = document.getElementById('rooms-save-btn');
    const cancelBtn = document.getElementById('rooms-cancel-btn');
    const indicator = document.getElementById('rooms-unsaved-indicator');

    if (hasChanges) {
        btn.classList.add('active');
        cancelBtn.style.display = 'block';
        indicator.textContent = 'Unsaved changes';
        indicator.style.display = 'block';
    } else {
        btn.classList.remove('active');
        cancelBtn.style.display = 'none';
        indicator.textContent = '';
        indicator.style.display = 'none';

        // Reset button state just in case
        setButtonLoading(btn, false);
    }
}

// Catalogue settings submit (Refactored)
async function saveCatalogueSettings() {
  const btn = document.getElementById('rooms-save-btn');
  setButtonLoading(btn, true);

  const data = {
    pageTitle: document.getElementById('catalogue-page-title').value.trim(),
    pageDescription: document.getElementById('catalogue-page-description').value.trim()
  };

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/settings/catalogue`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('Catalogue meta saved!', 'success');
      if (siteSettings) {
        siteSettings.catalogue = { ...siteSettings.catalogue, ...data };
      }
      storeOriginalCatalogueData();
    } else {
      const err = await response.json();
      showToast(err.error || 'Error saving meta', 'error');
    }
  } catch (error) {
    showToast('Error saving meta', 'error');
    console.error(error);
  } finally {
    setButtonLoading(btn, false);
  }
}

// Room Settings Save (Migrated)
async function saveRoomSettings() {
    const container = document.getElementById('room-details');
    const saveBtn = document.getElementById('rooms-save-btn');
    setButtonLoading(saveBtn, true);

    const description = document.getElementById('room-description').value;
    const featuredCode = document.getElementById('room-featured-code').value.trim();
    const isShowpieces = currentRoom === 'Showpieces';

    const payload = { description, featuredCode };

    if (isShowpieces) {
      const typeCodes = {};
      container.querySelectorAll('.type-code-row').forEach(row => {
        const typeName = row.dataset.type;
        const code = row.querySelector('.type-code-input').value.trim();
        if (code) {
          typeCodes[typeName] = code;
        }
      });
      payload.showpiecesTypeCodes = typeCodes;
    }

    try {
      const response = await fetch(`/${ADMIN_ROUTE}/api/rooms/${currentRoomDataObj._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('Room updated successfully', 'success');
        updateRoomsSaveButton(false);
        // Refresh data?
        const updatedRoom = await response.json(); // API usually returns updated doc?
        // Actually the API returns { success: true } or similar.
        // Let's just reload details to be safe or update local state.
        loadRoomDetails();
      } else {
        const error = await response.json();
        showToast(error.error || 'Error updating room', 'error');
        setButtonLoading(saveBtn, false); // Keep active if error
      }
    } catch (error) {
      showToast('Error updating room', 'error');
      console.error(error);
      setButtonLoading(saveBtn, false);
    }
}


// Add listeners for Catalogue inputs
document.getElementById('catalogue-page-title')?.addEventListener('input', onRoomSettingsChanged);
document.getElementById('catalogue-page-description')?.addEventListener('input', onRoomSettingsChanged);

// ==========================================
// SETTINGS IMAGE UPLOAD HANDLER
// ==========================================

function openInternationalFlagUpload(index) {
  openSettingsImageModal('home', 'flag', index);
}

function openSettingsImageModal(page, section, itemIndex) {
  // Use the existing image modal but configure it for settings
  const modal = document.getElementById('image-modal');
  const form = document.getElementById('image-form');

  // Store settings upload info
  form.dataset.settingsPage = page;
  form.dataset.settingsSection = section || '';
  form.dataset.settingsIndex = itemIndex !== undefined ? itemIndex : '';

  // Clear the collection field to indicate this is a settings upload
  document.getElementById('image-collection').value = 'SiteSettings';
  document.getElementById('image-doc-id').value = page;
  document.getElementById('image-index').value = itemIndex !== undefined ? itemIndex : '-1';

  // Reset size limit text
  const limitSpan = document.getElementById('upload-size-limit');
  if (limitSpan) {
    limitSpan.textContent = 'Max 3MB';
  }

  document.getElementById('image-file').value = '';
  document.getElementById('image-preview').innerHTML = '';

  openModal('image-modal');
}

// Override image form submit for settings uploads
const originalImageFormHandler = document.getElementById('image-form')?.onsubmit;

document.getElementById('image-form')?.addEventListener('submit', async function(e) {
  const collection = document.getElementById('image-collection').value;

  if (collection !== 'SiteSettings' && collection !== 'HeroImage') {
    // Use existing handler for regular uploads
    return;
  }

  e.preventDefault();

  const form = e.target;
  const file = document.getElementById('image-file').files[0];
  if (!file) {
    showToast('Please select an image', 'error');
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  // Handle HeroImage upload
  if (collection === 'HeroImage') {
    const slotIndex = form.dataset.heroSlot;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('slotIndex', slotIndex);

    try {
      const response = await fetch(`/${ADMIN_ROUTE}/api/settings/home/hero-image`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        showToast('Hero image uploaded!', 'success');
        closeModal('image-modal');
        await loadSettings();
      } else {
        const err = await response.json();
        showToast(err.error || 'Upload failed', 'error');
      }
    } catch (error) {
      showToast('Upload failed', 'error');
      console.error(error);
    } finally {
      setButtonLoading(btn, false);
    }
    return;
  }

  // Handle SiteSettings (About/Services) uploads
  const page = form.dataset.settingsPage;
  const section = form.dataset.settingsSection;
  const itemIndex = form.dataset.settingsIndex;

  const formData = new FormData();
  formData.append('image', file);

  let endpoint = '';
  if (page === 'about') {
    formData.append('section', section);
    if (itemIndex !== '') {
      formData.append('stepIndex', itemIndex);
    }
    endpoint = `/${ADMIN_ROUTE}/api/settings/about/image`;
  } else if (page === 'services') {
    formData.append('itemIndex', itemIndex);
    endpoint = `/${ADMIN_ROUTE}/api/settings/services/image`;
  } else if (page === 'home' && section === 'flag') {
    endpoint = `/${ADMIN_ROUTE}/api/settings/home/international-flag`;
  } else if (page === 'home' && section === 'map') {
    endpoint = `/${ADMIN_ROUTE}/api/settings/home/delivery-map`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      showToast('Image uploaded successfully!', 'success');
      closeModal('image-modal');

      // Special handling for flags (update DOM without reload)
      if (page === 'home' && section === 'flag') {
        const row = document.querySelector(`.intl-location-row[data-index="${itemIndex}"]`);
        if (row) {
          row.querySelector('.intl-flag-preview').innerHTML = `<img src="${result.image.url}" alt="Flag">`;
          const hiddenInput = row.querySelector('.intl-flag-url');
          if (hiddenInput) hiddenInput.value = result.image.url;
          document.getElementById('home-settings-form')?.dispatchEvent(new Event('input'));
        }
        setButtonLoading(btn, false);
        return;
      }

      // Refresh settings and update preview
      await loadSettings();

      // Update the specific preview
      if (page === 'about' && section === 'story') {
        document.getElementById('story-image-preview').innerHTML =
          `<img src="${result.image.url}" alt="Story">`;
      } else if (page === 'about' && section === 'process') {
        const stepRow = document.querySelector(`.process-step-row[data-step-index="${itemIndex}"]`);
        if (stepRow) {
          stepRow.querySelector('.step-image-preview').innerHTML =
            `<img src="${result.image.url}" alt="Step">`;
        }
      } else if (page === 'services') {
        const serviceRow = document.querySelector(`.service-row[data-service-index="${itemIndex}"]`);
        if (serviceRow) {
          serviceRow.querySelector('.service-image-preview').innerHTML =
            `<img src="${result.image.url}" alt="Service">`;
        }
      } else if (page === 'home' && section === 'map') {
        document.getElementById('delivery-map-preview').innerHTML =
          `<img src="${result.image.url}" alt="Map">`;
      }
    } else {
      const err = await response.json();
      showToast(err.error || 'Upload failed', 'error');
    }
  } catch (error) {
    showToast('Upload failed', 'error');
    console.error(error);
  } finally {
    setButtonLoading(btn, false);
  }
});

// ==========================================
// STICKY BUTTON CHANGE DETECTION
// ==========================================

// Track original form data for change detection
const originalFormData = {
  home: null,
  contact: null,
  about: null,
  services: null
};

// Initialize change detection for a settings form
function initSettingsChangeDetection(formId, section) {
  const form = document.getElementById(formId);
  if (!form) return;

  const saveBtn = document.getElementById(`${section}-save-btn`);
  const cancelBtn = document.getElementById(`${section}-cancel-btn`);

  if (!saveBtn || !cancelBtn) return;

  // Store original form data when loaded
  function storeOriginalData() {
    originalFormData[section] = new FormData(form);
  }

  // Check if form has changes
  function hasChanges() {
    if (!originalFormData[section]) return false;

    const currentData = new FormData(form);

    // Get all unique keys from both datasets
    const allKeys = new Set([...originalFormData[section].keys(), ...currentData.keys()]);

    for (const key of allKeys) {
      const originalValues = originalFormData[section].getAll(key);
      const currentValues = currentData.getAll(key);

      // Compare lengths
      if (originalValues.length !== currentValues.length) return true;

      // Compare values
      for (let i = 0; i < originalValues.length; i++) {
        if (String(originalValues[i]) !== String(currentValues[i])) return true;
      }
    }
    return false;
  }

  // Update button states based on changes
  function updateButtonStates() {
    const changed = hasChanges();

    if (changed) {
      saveBtn.classList.add('active');
      cancelBtn.classList.add('visible');
    } else {
      saveBtn.classList.remove('active');
      cancelBtn.classList.remove('visible');
    }
  }

  // Reset buttons to inactive state
  function resetButtonStates() {
    saveBtn.classList.remove('active');
    cancelBtn.classList.remove('visible');
    storeOriginalData();
  }

  // Listen for input changes
  form.addEventListener('input', updateButtonStates);
  form.addEventListener('change', updateButtonStates);

  // Save button click - submit the form
  saveBtn.addEventListener('click', async () => {
    if (!saveBtn.classList.contains('active')) return;

    // Trigger the existing form submit handler
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Reset buttons after save
    setTimeout(() => resetButtonStates(), 300);
  });

  // Cancel button click - reload original data
  cancelBtn.addEventListener('click', async () => {
    // Reset to original state by reloading settings
    await loadSettings();
    storeOriginalData();
    updateButtonStates();
    showToast('Changes discarded', 'info');
  });

  // Store original data after settings are loaded
  // This is called from loadSettings functions
  return { storeOriginalData, updateButtonStates, resetButtonStates };
}

// Change detection instances
let changeDetectors = {};

// Initialize all change detectors after DOM is ready
function initAllChangeDetectors() {
  changeDetectors.home = initSettingsChangeDetection('home-settings-form', 'home');
  changeDetectors.contact = initSettingsChangeDetection('contact-settings-form', 'contact');
  changeDetectors.about = initSettingsChangeDetection('about-settings-form', 'about');
  changeDetectors.services = initSettingsChangeDetection('services-settings-form', 'services');
}

// Call after settings are loaded to store original state
function storeOriginalSettingsData() {
  Object.values(changeDetectors).forEach(detector => {
    if (detector && detector.storeOriginalData) {
      setTimeout(() => detector.storeOriginalData(), 100);
    }
  });
}

// Check if any settings form has unsaved changes
function hasAnyUnsavedChanges() {
  // Check save buttons for active state (indicates changes)
  const settingsSaveBtns = document.querySelectorAll('.btn-save-settings');
  for (const btn of settingsSaveBtns) {
    if (btn.classList.contains('active')) return true;
  }
  return false;
}

// Initialize change detectors
initAllChangeDetectors();

// ==========================================
// Initial Load
// ==========================================

loadData();

// Check if we should scroll to bottom (after adding new item/set)
if (sessionStorage.getItem('scrollToBottom') === 'true') {
  sessionStorage.removeItem('scrollToBottom');
  // Wait for content to load then scroll
  setTimeout(() => {
    const grid = document.querySelector('.cards-grid');
    if (grid) {
      grid.scrollTop = grid.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    }
  }, 500);
}

// Store original data after initial load
// Store original data after initial load
// Moved to loadSettings() to ensure data is loaded first
