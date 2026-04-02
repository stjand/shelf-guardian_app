/* ── DOM refs ──────────────────────────────────────── */
const cameraOverlay = document.getElementById('camera-overlay');
const scanGuide     = document.getElementById('scan-guide');
const theForm       = document.getElementById('add-form');
const inpBarcode    = document.getElementById('inp-barcode');
const inpName       = document.getElementById('inp-name');
const inpBrand      = document.getElementById('inp-brand');
const inpCategory   = document.getElementById('inp-cat');
const inpQty        = document.getElementById('inp-qty');
const inpExpiry     = document.getElementById('inp-expiry');
const bannerLoading = document.getElementById('lookup-loading');
const bannerFound   = document.getElementById('lookup-found');
const submitBtn     = document.getElementById('submit-btn');
const successScreen = document.getElementById('success-screen');
const searchInput   = document.getElementById('product-search');
const searchResults = document.getElementById('search-results');

let isScanning        = false;
let detectionCount    = 0;
let previousDetection = null;
const THRESHOLD       = 3;

/* ── Helpers ────────────────────────────────────────── */
function show(el) { if (el) el.classList.add('show', 'open'); }
function hide(el) { if (el) el.classList.remove('show', 'open'); }

function escH(s) {
    return String(s ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escA(s) {
    return String(s ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

/* ── Init ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const startBtn = document.getElementById('start-cam-btn');
    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (theForm)  theForm.addEventListener('submit', handleSave);

    const triggerBtn = document.getElementById('btn-trigger-scan');
    const scannerWidget = document.getElementById('scanner-widget');
    if (triggerBtn && scannerWidget) {
        triggerBtn.addEventListener('click', () => {
            scannerWidget.style.display = 'block';
            triggerBtn.style.display = 'none';
            startCamera();
        });
    }

    // Default expiry (2 months)
    const d = new Date(); d.setMonth(d.getMonth() + 2);
    if (inpExpiry) inpExpiry.value = d.toISOString().split('T')[0];

    // Manual barcode
    if (inpBarcode) {
        inpBarcode.addEventListener('change', e => {
            const v = e.target.value.trim();
            if (v) lookupBarcode(v);
        });
    }

    // Search with debounce
    let timer;
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const q = e.target.value.trim();
            clearTimeout(timer);
            if (q.length < 2) { hide(searchResults); return; }
            timer = setTimeout(() => doSearch(q), 300);
        });
    }

    document.addEventListener('click', e => {
        if (!searchInput?.contains(e.target) && !searchResults?.contains(e.target)) {
            hide(searchResults);
        }
    });
});

/* ── Search ─────────────────────────────────────────── */
async function doSearch(q) {
    try {
        const res      = await fetch(`/api/search-products?q=${encodeURIComponent(q)}`);
        const products = await res.json();
        renderSearch(products);
    } catch (e) {
        console.error('Search failed:', e);
    }
}

function renderSearch(products) {
    if (!searchResults) return;
    if (!products?.length) {
        searchResults.innerHTML = `<div class="sr-empty">No products found</div>`;
        show(searchResults);
        return;
    }
    searchResults.innerHTML = products.map(p => `
        <div class="sr-item" role="option"
             onclick="pickProduct('${escA(p.barcode)}','${escA(p.name)}','${escA(p.brand)}','${escA(p.category)}')">
            <div class="sr-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                    <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
                    <path d="M12 3v6"/>
                </svg>
            </div>
            <div style="flex:1;min-width:0;">
                <div class="sr-name truncate">${escH(p.name)}</div>
                <div class="sr-meta">${escH(p.brand || 'No Brand')} &bull; ${escH(p.category)}</div>
            </div>
            <div class="sr-barcode">${escH(p.barcode)}</div>
        </div>
    `).join('');
    show(searchResults);
}

window.pickProduct = (barcode, name, brand, category) => {
    if (inpBarcode)  inpBarcode.value  = barcode;
    if (inpName)     inpName.value     = name;
    if (inpBrand)    inpBrand.value    = brand;
    if (inpCategory) inpCategory.value = category;
    hide(searchResults);
    if (searchInput) searchInput.value = '';
    show(bannerFound);
    if (inpQty) inpQty.focus();
};

/* ── Camera ─────────────────────────────────────────── */
function startCamera() {
    isScanning = true;
    if (cameraOverlay) cameraOverlay.style.display = 'none';
    if (scanGuide)     scanGuide.classList.add('active');

    Quagga.init({
        inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: document.querySelector('#interactive'),
            constraints: { width: 640, height: 480, facingMode: 'environment' }
        },
        decoder: { readers: ['ean_reader','upc_reader','upc_e_reader','code_128_reader'] },
        locate: true
    }, err => {
        if (err) {
            alert('Camera access failed or was blocked.');
            stopCamera();
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(onDetected);
}

function stopCamera() {
    if (!isScanning) return;
    Quagga.stop();
    Quagga.offDetected(onDetected);
    isScanning = false;
    if (scanGuide) scanGuide.classList.remove('active');

    if (cameraOverlay) {
        cameraOverlay.style.display = '';
        cameraOverlay.innerHTML = `
            <button id="start-cam-btn" onclick="startCamera()" class="cam-btn" aria-label="Restart scanner">
                <div class="cam-btn-ring">
                    <div class="cam-btn-core" style="background:#ef4444;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                             stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="2" x2="22" y1="2" y2="22"/>
                            <path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"/>
                            <path d="M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5"/>
                            <path d="M14.121 15.121A3 3 0 1 1 9.88 10.88"/>
                        </svg>
                    </div>
                </div>
                <div class="cam-btn-label">
                    <div class="cam-btn-title">Tap to Restart</div>
                    <div class="cam-btn-sub">Camera stopped</div>
                </div>
            </button>`;
    }
}

function onDetected(result) {
    const code = result.codeResult.code;
    if (code === previousDetection) {
        detectionCount++;
    } else {
        previousDetection = code;
        detectionCount = 1;
    }
    if (detectionCount >= THRESHOLD) {
        stopCamera();
        if (inpBarcode) inpBarcode.value = code;
        lookupBarcode(code);
    }
}

/* ── Barcode lookup ─────────────────────────────────── */
async function lookupBarcode(barcode) {
    show(bannerLoading);
    hide(bannerFound);
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch(`/api/products/${barcode}`);
        if (res.ok) {
            const prod = await res.json();
            if (inpName)  inpName.value  = prod.name;
            if (inpBrand) inpBrand.value = prod.brand || '';
            if (inpCategory) {
                const opts = Array.from(inpCategory.options).map(o => o.value);
                if (opts.includes(prod.category)) inpCategory.value = prod.category;
            }
            show(bannerFound);
        } else {
            if (inpName)  { inpName.value  = ''; inpName.focus(); }
            if (inpBrand) inpBrand.value = '';
        }
    } catch (e) {
        console.error('Lookup error:', e);
    } finally {
        hide(bannerLoading);
        if (submitBtn) submitBtn.disabled = false;
    }
}

/* ── Save ───────────────────────────────────────────── */
async function handleSave(e) {
    e.preventDefault();
    if (!submitBtn) return;

    const orig = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg style="width:18px;height:18px;animation:sgSpin .7s linear infinite;" xmlns="http://www.w3.org/2000/svg"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Saving…`;

    const data = {
        barcode:     inpBarcode?.value    || '',
        name:        inpName?.value       || '',
        brand:       inpBrand?.value      || '',
        category:    inpCategory?.value   || '',
        quantity:    parseInt(inpQty?.value) || 1,
        expiry_date: inpExpiry?.value     || ''
    };

    try {
        const res = await fetch('/api/inventory', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data)
        });

        if (res.ok) {
            const msgEl = document.getElementById('success-msg');
            if (msgEl) msgEl.textContent = `${data.name} added to your shelf.`;
            show(successScreen);

            setTimeout(() => {
                hide(successScreen);
                if (inpBarcode)  inpBarcode.value  = '';
                if (inpName)     inpName.value     = '';
                if (inpBrand)    inpBrand.value    = '';
                if (inpQty)      inpQty.value      = '1';
                hide(bannerFound);
                submitBtn.innerHTML = orig;
                submitBtn.disabled  = false;
                previousDetection = null;
                detectionCount    = 0;
                const d = new Date(); d.setMonth(d.getMonth() + 2);
                if (inpExpiry) inpExpiry.value = d.toISOString().split('T')[0];
            }, 2000);
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err?.message || 'Error saving item. Please try again.');
            submitBtn.innerHTML = orig;
            submitBtn.disabled  = false;
        }
    } catch (e) {
        console.error('Save error:', e);
        alert('Network error. Check your connection.');
        submitBtn.innerHTML = orig;
        submitBtn.disabled  = false;
    }
}
