/* ==========================================
   Admin Dashboard Client-Side Logic
   ========================================== */

// State
let currentTab = 'sets';
let currentRoom = 'Living Room';
let currentStyle = 'Royal';
let currentType = '';
let deleteTarget = null;

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
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    // Update active states
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tab}-tab`) {
        content.classList.add('active');
      }
    });

    currentTab = tab;
    loadData();
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
    loadRoomDetails();
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
      loadRoomDetails();
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
    attachRoomListeners(container, room);
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
          ? `<img src="${imageUrl}" alt="${set.name}">`
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
          ? `<img src="${imageUrl}" alt="${item.name}">`
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
  const imageUrl = room.images && room.images[0] ? room.images[0].url : '';
  return `
    <div class="room-card" data-id="${room._id}">
      <div class="room-image">
        ${imageUrl
          ? `<img src="${imageUrl}" alt="${room.name}">`
          : '<div class="no-image">No image</div>'
        }
        <button class="image-edit-btn" title="Update image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
      <div class="room-body">
        <h3>${room.name}</h3>
        <div class="room-field">
          <label>Description</label>
          <textarea id="room-description">${room.description || ''}</textarea>
        </div>
        <div class="room-actions">
          <button class="save-room-btn">Save Changes</button>
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
  // Image edit
  container.querySelector('.image-edit-btn').addEventListener('click', () => {
    openImageModal('Room', room._id, room.images && room.images.length > 0 ? 0 : -1);
  });

  // Save room (only description - hasIndividualItems is auto-calculated)
  container.querySelector('.save-room-btn').addEventListener('click', async () => {
    const description = document.getElementById('room-description').value;

    try {
      const response = await fetch(`/${ADMIN_ROUTE}/api/rooms/${room._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      if (response.ok) {
        showToast('Room updated successfully', 'success');
      } else {
        showToast('Error updating room', 'error');
      }
    } catch (error) {
      showToast('Error updating room', 'error');
      console.error(error);
    }
  });
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

// Validate image file for size, format, and aspect ratio
function validateImage(file, expectedRatio, ratioLabel) {
  return new Promise((resolve, reject) => {
    // Check file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      reject(`File size must be less than 1MB (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      return;
    }

    // Check file format (webp only)
    if (!file.name.toLowerCase().endsWith('.webp')) {
      reject('Only .webp format is allowed');
      return;
    }

    // Check aspect ratio
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const actualRatio = img.width / img.height;
      const tolerance = 0.05; // 5% tolerance

      if (Math.abs(actualRatio - expectedRatio) > tolerance) {
        reject(`Image must be ${ratioLabel} aspect ratio (current: ${img.width}x${img.height})`);
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

// Set image preview with validation (4:3 aspect ratio)
document.getElementById('set-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const previewEl = document.getElementById('set-image-preview');

  if (file) {
    try {
      await validateImage(file, 4/3, '4:3');
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
  document.getElementById('item-price').value = '';
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

// Item image preview with validation (1:1 aspect ratio)
document.getElementById('item-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const previewEl = document.getElementById('item-image-preview');

  if (file) {
    try {
      await validateImage(file, 1, '1:1');
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
      loadSets();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error creating set', 'error');
    }
  } catch (error) {
    showToast('Error creating set', 'error');
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
  formData.append('price', document.getElementById('item-price').value || '');
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
      loadItems();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error creating item', 'error');
    }
  } catch (error) {
    showToast('Error creating item', 'error');
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
  openModal('image-modal');
}

// Image preview
document.getElementById('image-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  }
});

// Image Form Submit
document.getElementById('image-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const response = await fetch(`/${ADMIN_ROUTE}/api/upload-image`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      showToast('Image uploaded successfully', 'success');
      closeModal('image-modal');
      loadData();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error uploading image', 'error');
    }
  } catch (error) {
    showToast('Error uploading image', 'error');
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
// Initial Load
// ==========================================

loadData();
