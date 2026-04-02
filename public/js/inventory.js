let allItems = [];
let filterStatus = 'active';

const listEl = document.getElementById('inventory-list');
const countEl = document.getElementById('header-active-count');
const searchInp = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const tabs = document.querySelectorAll('#filter-tabs button');

document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();

    searchInp.addEventListener('input', renderList);
    refreshBtn.addEventListener('click', fetchInventory);

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => {
                t.className = 'px-3 py-1 rounded-full text-xs font-medium transition bg-gray-100 text-gray-500 hover:bg-gray-200';
            });
            e.target.className = 'px-3 py-1 rounded-full text-xs font-medium transition bg-green-600 text-white';
            filterStatus = e.target.getAttribute('data-status');
            renderList();
        });
    });
});

async function fetchInventory() {
    refreshBtn.querySelector('i').classList.add('animate-spin');
    try {
        const res = await fetch('/api/inventory');
        allItems = await res.json();
        renderList();
    } catch (error) {
        console.error(error);
        listEl.innerHTML = `<div class="text-center py-16 text-red-500 text-sm">Error connecting to server.</div>`;
    } finally {
        setTimeout(() => refreshBtn.querySelector('i').classList.remove('animate-spin'), 300);
    }
}

function getDaysLeft(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((d - today) / (1000 * 60 * 60 * 24));
}

function rowColor(daysLeft) {
    if (daysLeft < 0) return 'border-l-4 border-l-red-500 bg-red-50';
    if (daysLeft <= 1) return 'border-l-4 border-l-red-400 bg-red-50';
    if (daysLeft <= 3) return 'border-l-4 border-l-amber-400 bg-amber-50';
    if (daysLeft <= 7) return 'border-l-4 border-l-yellow-300 bg-yellow-50';
    return 'border-l-4 border-l-green-300 bg-white';
}

function expiryBadgeColor(daysLeft) {
    if (daysLeft <= 1) return 'text-red-600 bg-red-100';
    if (daysLeft <= 3) return 'text-amber-700 bg-amber-100';
    if (daysLeft <= 7) return 'text-yellow-700 bg-yellow-100';
    return 'text-green-700 bg-green-100';
}

function renderList() {
    const q = searchInp.value.toLowerCase();

    // For local database, 'status' doesn't exist on inventory table schema. 
    // Just simulating filter locally:
    const displayed = allItems.filter(i => i.name.toLowerCase().includes(q));

    countEl.innerText = `${allItems.length} active items`;

    if (displayed.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-16">
                <p class="text-gray-400 text-sm">No items found</p>
                <p class="text-gray-300 text-xs mt-1">Scan or add items to get started</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = displayed.map(item => {
        const daysLeft = getDaysLeft(item.expiry_date);
        const formatExpiry = new Date(item.expiry_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        return `
            <div class="rounded-xl p-4 flex items-start justify-between shadow-sm border border-gray-100 ${rowColor(daysLeft)}">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${item.name}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs text-gray-500">Qty: ${item.quantity}</span>
                        ${item.brand ? `<span class="text-xs text-gray-500">· ${item.brand}</span>` : ''}
                    </div>
                    <div class="mt-2">
                        <span class="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide ${expiryBadgeColor(daysLeft)}">
                            ${formatExpiry}
                        </span>
                    </div>
                </div>
                <button onclick="deleteItem(${item.id})" class="ml-3 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

window.deleteItem = async function (id) {
    if (confirm('Are you sure you want to remove this item?')) {
        await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
        fetchInventory();
    }
}
