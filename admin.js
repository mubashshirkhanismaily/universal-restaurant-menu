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

    renderItems(data);
}

function renderItems(items) {
    itemListContainer.innerHTML = '';
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'menu-card';
        itemCard.innerHTML = `
            <img src="${item.image}" class="menu-image" alt="${item.name}">
            <div class="menu-content">
                <div class="menu-header">
                    <h4 class="item-name">${item.name}</h4>
                    <span style="font-size: 0.8rem; background: #eee; padding: 2px 6px; borderRadius: 4px;">${item.categories ? item.categories.name : 'Uncategorized'}</span>
                </div>
                <p class="item-desc">${item.description}</p>
                <div class="menu-footer">
                    <span class="item-price">₹${item.price}</span>
                    <button class="delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
                </div>
            </div>
        `;
        itemListContainer.appendChild(itemCard);
    });
}

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
