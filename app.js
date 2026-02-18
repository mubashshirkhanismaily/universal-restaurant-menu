// 🍽️ RESTAURANT NAME - Customer App Logic

// ⚠️ REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://cvfjtplzlmcvjwkqkime.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Zmp0cGx6bG1jdmp3a3FraW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzOTIzMTUsImV4cCI6MjA4Njk2ODMxNX0.7kZgnGVsN4xbNrNdAPk5VgGPu2l2cTVdkFr0r0cYXC0';
const WHATSAPP_NUMBER = '7666885770'; // Format: 919876543210


// Initialize Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// State
let categories = [];
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('restaurant_cart')) || [];
const GST_RATE = 0.05;

// DOM Elements
const categoryTabs = document.getElementById('category-tabs');
const menuGrid = document.getElementById('menu-grid');
const cartOverlay = document.getElementById('cart-overlay');
const cartDrawer = document.getElementById('cart-drawer');
const cartCount = document.getElementById('cart-count');
const floatingCartBtn = document.getElementById('floating-cart-btn');
const floatingTotal = document.getElementById('floating-total');
const cartBody = document.getElementById('cart-body');
const subtotalEl = document.getElementById('bill-subtotal');
const gstEl = document.getElementById('bill-gst');
const grandTotalEl = document.getElementById('bill-total');
const tableSelector = document.getElementById('table-selector');

// 🚀 Initialization
async function init() {
    generateTableButtons();
    setupCarousel();
    updateCartUI();
    await fetchData();
    renderCategories();
    renderMenuGrid(menuItems);
}

// 📡 Fetch Data from Supabase
async function fetchData() {
    try {
        // Fetch Categories
        const { data: catData, error: catError } = await supabaseClient
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });

        if (catError) throw catError;
        categories = catData;

        // Fetch Items
        const { data: itemData, error: itemError } = await supabaseClient
            .from('items')
            .select('*')
            .order('created_at', { ascending: true });

        if (itemError) throw itemError;
        menuItems = itemData;

    } catch (error) {
        console.error('Error fetching data:', error);
        menuGrid.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p>⚠️ Failed to load menu. Please checking your internet connection.</p>
                <button onclick="location.reload()" class="add-btn" style="margin-top: 10px;">Retry</button>
            </div>
        `;
    }
}

// 🎨 Render Categories
function renderCategories() {
    categoryTabs.innerHTML = `<div class="tab active" onclick="filterMenu('all', this)">🔥 All</div>`;
    categories.forEach(cat => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.innerText = `${cat.emoji} ${cat.name}`;
        tab.onclick = () => filterMenu(cat.id, tab);
        categoryTabs.appendChild(tab);
    });
}

// 🍽️ Filter & Render Menu
function filterMenu(categoryId, tabElement) {
    // Update Active Tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabElement.classList.add('active');

    // Filter Items
    const filteredItems = categoryId === 'all'
        ? menuItems
        : menuItems.filter(item => item.category_id === categoryId);

    renderMenuGrid(filteredItems);
}

function renderMenuGrid(items) {
    menuGrid.innerHTML = '';

    if (items.length === 0) {
        menuGrid.innerHTML = `<p style="text-align: center; color: #888; margin-top: 20px;">No items available in this category.</p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <img src="" alt="${item.name}" class="menu-image" loading="lazy" decoding="async">
            <div class="menu-content">
                <div class="menu-header">
                    <div>
                        <h3 class="item-name">${item.name}</h3>
                        <p class="item-desc">${item.description}</p>
                    </div>
                    <div class="veg-badge" style="border-color: ${item.is_veg ? 'var(--veg-green)' : '#cc0000'};">
                        <div class="veg-dot" style="background-color: ${item.is_veg ? 'var(--veg-green)' : '#cc0000'};"></div>
                    </div>
                </div>
                <div class="menu-footer">
                    <span class="item-price">₹${item.price}</span>
                    <button class="add-btn" onclick="addToCart('${item.id}')">ADD <i class="fas fa-plus" style="font-size: 0.8rem;"></i></button>
                </div>
            </div>
        `;
        const img = card.querySelector('img.menu-image');
        if (img) {
            const { src, original } = getInitialImageSrc(item.image);
            if (original) img.dataset.originalSrc = original;
            img.dataset.retryAttempts = '0';
            img.addEventListener('error', () => retryImage(img));
            img.src = src;
        }
        menuGrid.appendChild(card);
    });
}

// 🛒 Cart Logic
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    const existingItem = cart.find(i => i.id === itemId);

    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }

    saveCart();
    updateCartUI();
    showToast(`Added ${item.name}`);
}

function updateCartQty(itemId, change) {
    const itemIndex = cart.findIndex(i => i.id === itemId);
    if (itemIndex > -1) {
        cart[itemIndex].qty += change;
        if (cart[itemIndex].qty <= 0) {
            cart.splice(itemIndex, 1);
        }
        saveCart();
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('restaurant_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.innerText = totalQty;

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const gst = subtotal * GST_RATE;
    const total = subtotal + gst;

    // Update Floating Button
    floatingTotal.innerText = `₹${total.toFixed(0)}`;
    if (cart.length > 0) {
        floatingCartBtn.classList.add('visible');
    } else {
        floatingCartBtn.classList.remove('visible');
        cartOverlay.classList.remove('open');
        cartDrawer.classList.remove('open');
    }

    // Update Cart Drawer content
    renderCartItems();
    subtotalEl.innerText = `₹${subtotal.toFixed(2)}`;
    gstEl.innerText = `₹${gst.toFixed(2)}`;
    grandTotalEl.innerText = `₹${total.toFixed(2)}`;
}

function renderCartItems() {
    if (cart.length === 0) {
        cartBody.innerHTML = `
            <div style="text-align: center; color: #999; margin-top: 50px;">
                <i class="fas fa-shopping-basket fa-3x" style="margin-bottom: 10px; opacity: 0.5;"></i>
                <p>Your cart is empty</p>
            </div>`;
        return;
    }

    cartBody.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>₹${item.price} × ${item.qty}</p>
            </div>
            <div class="cart-controls">
                <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">−</button>
                <div class="qty-val">${item.qty}</div>
                <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
            </div>
        </div>
    `).join('');
}

function toggleCart() {
    // Removed empty check to allow viewing table selection
    cartOverlay.classList.toggle('open');
    cartDrawer.classList.toggle('open');
}

// 🎲 Utility Functions
function showToast(msg) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '100px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0,0,0,0.8)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.zIndex = '1000';
    toast.style.animation = 'fadeIn 0.3s';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function generateTableButtons() {
    tableSelector.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('div');
        btn.className = 'table-btn';
        btn.innerText = `Table ${i}`;
        btn.onclick = () => selectTable(i, btn);
        tableSelector.appendChild(btn);
    }
}

function selectTable(num, btn) {
    document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('selected-table').value = num;
}

// 🚀 Place Order
function placeOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const table = document.getElementById('selected-table').value;
    const notes = document.getElementById('order-notes').value.trim();

    if (!name || !phone) {
        alert('Please enter your Name and Phone Number.');
        return;
    }
    if (!table) {
        alert('Please select a Table Number.');
        return;
    }

    // Calculate Totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const gst = subtotal * GST_RATE;
    const total = subtotal + gst;

    // Format Items (use \n for newlines, encodeURIComponent handles it)
    let itemsList = cart.map(item => `   ▫️ ${item.name} (${item.qty}) - ₹${item.price * item.qty}`).join('\n');

    // Construct WhatsApp Message
    const message = `
*🆕 NEW ORDER: ${name}*
--------------------------------
📍 *Table No:* ${table}
📞 *Phone:* ${phone}

🛒 *ORDER SUMMARY*
--------------------------------
${itemsList}
--------------------------------

💵 *BILL DETAILS*
  • Subtotal:  ₹${subtotal.toFixed(2)}
  • GST (5%):  ₹${gst.toFixed(2)}
🔥 *GRAND TOTAL: ₹${total.toFixed(2)}*

📝 *Notes:* ${notes}

👉 *Please confirm this order.*
    `.trim();

    // Redirect
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    // Clear Cart & Redirect
    localStorage.removeItem('restaurant_cart');
    cart = [];
    updateCartUI();
    window.open(whatsappUrl, '_blank');
}

// 🎠 Carousel Logic
let currentSlide = 0;
function setupCarousel() {
    setInterval(() => {
        currentSlide = (currentSlide + 1) % 3;
        goToSlide(currentSlide);
    }, 3000);
}

function goToSlide(index) {
    currentSlide = index;
    document.getElementById('carousel-track').style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Start App
init();
