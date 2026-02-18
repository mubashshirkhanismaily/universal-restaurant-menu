// 🍽️ RESTAURANT NAME - Admin Panel Logic

// ⚠️ REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://cvfjtplzlmcvjwkqkime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Zmp0cGx6bG1jdmp3a3FraW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzOTIzMTUsImV4cCI6MjA4Njk2ODMxNX0.7kZgnGVsN4xbNrNdAPk5VgGPu2l2cTVdkFr0r0cYXC0';

// Initialize Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const categoryList = document.getElementById('category-list');
const itemCategorySelect = document.getElementById('item-category');
const addItemForm = document.getElementById('add-item-form');
const itemListContainer = document.getElementById('item-list-container');

// Edit modal elements
const editItemModal = document.getElementById('edit-item-modal');
const editItemForm = document.getElementById('edit-item-form');
const editItemError = document.getElementById('edit-item-error');
const editItemCloseBtn = document.getElementById('edit-item-close-btn');
const editItemCancelBtn = document.getElementById('edit-item-cancel-btn');
const editItemCategorySelect = document.getElementById('edit-item-category');

let itemsById = {};
let categoriesCache = [];

// Images: retry a few times, then fallback
const IMAGE_RETRY_LIMIT = 4;
const FALLBACK_IMAGE_DATA_URI =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f3f4f6'/%3E%3Cstop offset='100%25' stop-color='%23e5e7eb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='18' fill='url(%23g)'/%3E%3Cpath d='M70 145l25-28 22 25 18-20 35 40H70z' fill='%23cbd5e1'/%3E%3Ccircle cx='95' cy='90' r='12' fill='%23cbd5e1'/%3E%3Ctext x='50%25' y='78%25' text-anchor='middle' font-family='Poppins, Arial, sans-serif' font-size='14' fill='%2394a3b8'%3ENo image%3C/text%3E%3C/svg%3E";

function retryImage(imgEl) {
    if (!imgEl) return;

    const originalRaw = imgEl.dataset.originalSrc || imgEl.getAttribute('src') || '';
    const original = String(originalRaw || '').trim();
    if (!imgEl.dataset.originalSrc) imgEl.dataset.originalSrc = original;

    const attempts = Number(imgEl.dataset.retryAttempts || '0');
    if (!Number.isFinite(attempts)) imgEl.dataset.retryAttempts = '0';

    if (!original || original === 'undefined' || original === 'null') {
        imgEl.onerror = null;
        imgEl.src = FALLBACK_IMAGE_DATA_URI;
        return;
    }

    if (attempts >= IMAGE_RETRY_LIMIT) {
        imgEl.onerror = null;
        imgEl.src = FALLBACK_IMAGE_DATA_URI;
        return;
    }

    const nextAttempts = attempts + 1;
    imgEl.dataset.retryAttempts = String(nextAttempts);

    const sep = original.includes('?') ? '&' : '?';
    imgEl.src = `${original}${sep}img_retry=${nextAttempts}&t=${Date.now()}`;
}

function getInitialImageSrc(imageValue) {
    const s = String(imageValue || '').trim();
    if (!s || s === 'undefined' || s === 'null') return { src: FALLBACK_IMAGE_DATA_URI, original: '' };
    return { src: s, original: s };
}

// 🔒 Auth Check
async function checkAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadData();
}

// 🔑 Login Logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    errorMsg.innerText = '';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        showDashboard();
    } catch (error) {
        errorMsg.innerText = error.message;
    }
});

// 🚪 Logout logic
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

// 📡 Load Dashboard Data
async function loadData() {
    await fetchCategories();
    await fetchItems();
}

// 📂 Categories Logic
async function fetchCategories() {
    const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    categoriesCache = data ?? [];
    renderCategories(data);
    updateCategoryDropdown(data);
}

function renderCategories(categories) {
    categoryList.innerHTML = '';
    categories.forEach(cat => {
        const badge = document.createElement('span');
        badge.className = 'tab'; // Reuse style
        badge.innerHTML = `${cat.emoji} ${cat.name} <i class="fas fa-times" onclick="deleteCategory('${cat.id}')" style="margin-left: 5px; color: red; cursor: pointer;"></i>`;
        categoryList.appendChild(badge);
    });
}

function updateCategoryDropdown(categories) {
    itemCategorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.emoji} ${cat.name}`;
        itemCategorySelect.appendChild(option);
    });

    if (editItemCategorySelect) {
        editItemCategorySelect.innerHTML = '<option value="">Select Category</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.emoji} ${cat.name}`;
            editItemCategorySelect.appendChild(option);
        });
    }
}

async function addCategory() {
    const name = document.getElementById('cat-name').value;
    const emoji = document.getElementById('cat-emoji').value;

    if (!name) return alert('Category Name is required');

    const { error } = await supabaseClient
        .from('categories')
        .insert([{ name, emoji }]);

    if (error) {
        alert('Error adding category: ' + error.message);
    } else {
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-emoji').value = '';
        fetchCategories();
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure? This will delete all items in this category!')) return;

    const { error } = await supabaseClient
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting category: ' + error.message);
    } else {
        fetchCategories();
        fetchItems(); // Items might be deleted via cascade or just orphaned
    }
}

// 🍔 Menu Items Logic
async function fetchItems() {
    const { data, error } = await supabaseClient
        .from('items')
        .select('*, categories(name)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching items:', error);
        return;
    }

    itemsById = Object.fromEntries((data ?? []).map(i => [i.id, i]));
    renderItems(data);
}

function renderItems(items) {
    itemListContainer.innerHTML = '';
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'menu-card';
        itemCard.innerHTML = `
            <img src="" class="menu-image" alt="${item.name}" loading="lazy" decoding="async">
            <div class="menu-content">
                <div class="menu-header">
                    <h4 class="item-name">${item.name}</h4>
                    <span style="font-size: 0.8rem; background: #eee; padding: 2px 6px; borderRadius: 4px;">${item.categories ? item.categories.name : 'Uncategorized'}</span>
                </div>
                <p class="item-desc">${item.description}</p>
                <div class="menu-footer">
                    <span class="item-price">₹${item.price}</span>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="edit-btn" onclick="openEditItem('${item.id}')">Edit</button>
                        <button class="delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
        const img = itemCard.querySelector('img.menu-image');
        if (img) {
            const { src, original } = getInitialImageSrc(item.image);
            if (original) img.dataset.originalSrc = original;
            img.dataset.retryAttempts = '0';
            img.addEventListener('error', () => retryImage(img));
            img.src = src;
        }
        itemListContainer.appendChild(itemCard);
    });
}

function openEditItem(id) {
    const item = itemsById[id];
    if (!item) return alert('Item not found. Please refresh.');

    editItemError.innerText = '';

    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-item-name').value = item.name ?? '';
    document.getElementById('edit-item-desc').value = item.description ?? '';
    document.getElementById('edit-item-image').value = item.image ?? '';
    document.getElementById('edit-item-price').value = item.price ?? '';
    document.getElementById('edit-item-category').value = item.category_id ?? '';
    document.getElementById('edit-item-veg').checked = !!item.is_veg;

    editItemModal.classList.remove('hidden');
}

function closeEditModal() {
    editItemModal.classList.add('hidden');
    editItemForm.reset();
    editItemError.innerText = '';
}

editItemCloseBtn?.addEventListener('click', closeEditModal);
editItemCancelBtn?.addEventListener('click', closeEditModal);
editItemModal?.addEventListener('click', (e) => {
    if (e.target === editItemModal) closeEditModal();
});

editItemForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    editItemError.innerText = '';

    const id = document.getElementById('edit-item-id').value;
    const name = document.getElementById('edit-item-name').value.trim();
    const description = document.getElementById('edit-item-desc').value.trim();
    const image = document.getElementById('edit-item-image').value.trim();
    const priceRaw = document.getElementById('edit-item-price').value;
    const category_id = document.getElementById('edit-item-category').value;
    const is_veg = document.getElementById('edit-item-veg').checked;

    if (!id) return;
    if (!category_id) {
        editItemError.innerText = 'Please select a category.';
        return;
    }

    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
        editItemError.innerText = 'Please enter a valid price.';
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('items')
            .update({ name, description, image, price, category_id, is_veg })
            .eq('id', id);

        if (error) throw error;

        closeEditModal();
        await fetchItems();
    } catch (err) {
        editItemError.innerText = err?.message || 'Failed to update item.';
    }
});

addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('item-name').value;
    const description = document.getElementById('item-desc').value;
    const image = document.getElementById('item-image').value;
    const price = document.getElementById('item-price').value;
    const category_id = document.getElementById('item-category').value;
    const is_veg = document.getElementById('item-veg').checked;

    if (!category_id) return alert('Please select a category');

    const { error } = await supabaseClient
        .from('items')
        .insert([{
            name,
            description,
            image,
            price,
            category_id,
            is_veg
        }]);

    if (error) {
        alert('Error adding item: ' + error.message);
    } else {
        addItemForm.reset();
        fetchItems();
    }
});

async function deleteItem(id) {
    if (!confirm('Delete this item?')) return;

    const { error } = await supabaseClient
        .from('items')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting item: ' + error.message);
    } else {
        fetchItems();
    }
}

// Check Auth on Load
checkAuth();
