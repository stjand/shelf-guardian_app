// State Variables
let inventory = [];

// DOM Elements
const inventoryList = document.getElementById('inventory-list');
const totalItemsEl = document.getElementById('total-items');
const scanBtn = document.getElementById('scan-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const scannerModal = document.getElementById('scanner-modal');
const interactiveEl = document.getElementById('interactive');
const scanResultBox = document.getElementById('scan-result');
const addInventoryBtn = document.getElementById('add-inventory-btn');

// Form Elements
const detectedBarcodeInp = document.getElementById('detected-barcode');
const scannedNameInp = document.getElementById('scanned-name');
const scannedBrandInp = document.getElementById('scanned-brand');
const scannedCategorySelect = document.getElementById('scanned-category');
const scannedQtyInp = document.getElementById('scanned-qty');
const scannedExpiryInp = document.getElementById('scanned-expiry');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    scanBtn.addEventListener('click', openScanner);
    closeModalBtn.addEventListener('click', closeScanner);
    addInventoryBtn.addEventListener('click', saveToInventory);
}

// Fetch Inventory from Backend
async function fetchInventory() {
    try {
        const response = await fetch('/api/inventory');
        inventory = await response.json();
        renderInventory();
    } catch (error) {
        console.error('Error fetching inventory:', error);
        inventoryList.innerHTML = '<p style="color: red; text-align: center;">Failed to load inventory.</p>';
    }
}

// Check Expiry Status
function getExpiryStatus(dateStr) {
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { class: 'status-danger', text: 'Expired' };
    if (diffDays <= 7) return { class: 'status-warning', text: `Expiring in ${diffDays} days` };
    return { class: 'status-good', text: 'Good' };
}

// Render Inventory to DOM
function renderInventory() {
    totalItemsEl.innerText = `${inventory.length} items`;

    if (inventory.length === 0) {
        inventoryList.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <p>Your shelf is empty.</p>
                <p>Tap 'Scan' to add items.</p>
            </div>
        `;
        return;
    }

    inventoryList.innerHTML = inventory.map(item => {
        const status = getExpiryStatus(item.expiry_date);

        return `
            <div class="card" data-id="${item.id}">
                <div class="card-info">
                    <h3>${item.name}</h3>
                    <div class="card-meta">
                        <span>${item.brand} • ${item.category}</span>
                    </div>
                    <span class="status-badge ${status.class}">${status.text}</span>
                </div>
                <div class="card-actions">
                    <div class="qty-badge">${item.quantity}</div>
                    <button class="btn-delete" onclick="deleteItem(${item.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Delete Item
window.deleteItem = async function (id) {
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
        const response = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchInventory();
        }
    } catch (err) {
        console.error('Error deleting:', err);
    }
}

// --- SCANNER LOGIC ---
let isScanning = false;

function openScanner() {
    scannerModal.classList.remove('hidden');
    interactiveEl.style.display = 'flex';
    scanResultBox.classList.add('hidden');

    // Set default expiry date to 3 months from now
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 3);
    scannedExpiryInp.value = defaultExpiry.toISOString().split('T')[0];

    startQuagga();
}

function closeScanner() {
    scannerModal.classList.add('hidden');
    if (isScanning) {
        Quagga.stop();
        isScanning = false;
    }
}

function startQuagga() {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: 480,
                height: 320,
                facingMode: "environment" // Use back camera
            },
        },
        decoder: {
            readers: ["ean_reader", "upc_reader", "upc_e_reader"]
        }
    }, function (err) {
        if (err) {
            console.error(err);
            alert("Camera access failed. Please ensure permissions are granted.");
            return;
        }
        Quagga.start();
        isScanning = true;
    });

    Quagga.onDetected(onBarcodeDetected);
}

// Track previous scans slightly to prevent false positives
let lastDetected = null;
let scanCount = 0;

async function onBarcodeDetected(result) {
    const code = result.codeResult.code;

    // Simple debounce/verification (require 3 identical consecutive reads)
    if (code === lastDetected) {
        scanCount++;
    } else {
        lastDetected = code;
        scanCount = 0;
    }

    if (scanCount >= 3) {
        // Barcode successfully confirmed
        Quagga.stop();
        isScanning = false;
        interactiveEl.style.display = 'none';
        scanResultBox.classList.remove('hidden');

        detectedBarcodeInp.value = code;
        await lookupProduct(code);
    }
}

async function lookupProduct(barcode) {
    try {
        const response = await fetch(`/api/products/${barcode}`);
        if (response.ok) {
            // Product found in DB
            const product = await response.json();
            scannedNameInp.value = product.name;
            scannedBrandInp.value = product.brand || '';
            scannedCategorySelect.value = product.category || 'Other';
        } else {
            // New Product
            scannedNameInp.value = '';
            scannedBrandInp.value = '';
            scannedNameInp.focus();
        }
    } catch (err) {
        console.error("Lookup error", err);
    }
}

async function saveToInventory() {
    const data = {
        barcode: detectedBarcodeInp.value,
        name: scannedNameInp.value,
        brand: scannedBrandInp.value,
        category: scannedCategorySelect.value,
        quantity: parseInt(scannedQtyInp.value),
        expiry_date: scannedExpiryInp.value
    };

    if (!data.name || !data.expiry_date) {
        alert("Please fill in the product name and expiry date.");
        return;
    }

    // Save
    try {
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeScanner();
            fetchInventory(); // Reload list
        } else {
            alert('Failed to save to inventory');
        }
    } catch (err) {
        console.error('Save error', err);
        alert('Server connection error.');
    }
}
