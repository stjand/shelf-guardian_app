import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, Loader2, CheckCircle2, ChevronDown, Database, PackageSearch } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'
import Quagga, { type QuaggaJSResultObject } from '@ericblade/quagga2'

interface ScannedProduct {
    name: string
    brand?: string
    category?: string
    barcode?: string
}

type LookupState = 'idle' | 'loading' | 'found-local' | 'found-api' | 'notfound'

export default function ScanPage() {
    const { shop, suppliers, user, fetchStock } = useStore()
    const [mode, setMode] = useState<'idle' | 'scanning' | 'form'>('idle')
    const [scanned, setScanned] = useState<ScannedProduct | null>(null)
    const [lookup, setLookup] = useState<LookupState>('idle')
    const scannerRef = useRef<HTMLDivElement>(null)
    const [saved, setSaved] = useState(false)
    const hasLookedUp = useRef<string | null>(null)

    // Form state
    const [productName, setProductName] = useState('')
    const [quantity, setQuantity] = useState('1')
    const [expiryDate, setExpiryDate] = useState('')
    const [batchNo, setBatchNo] = useState('')
    const [supplierId, setSupplierId] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // ─── LOOKUP LOGIC ────────────────────────────────────────────────────────────
    async function lookupBarcode(barcode: string) {
        if (hasLookedUp.current === barcode) return
        hasLookedUp.current = barcode
        setLookup('loading')

        // Step 1: Check our own local database first (instant for repeat scans)
        try {
            const { data: localProduct } = await supabase
                .from('products')
                .select('*')
                .eq('barcode', barcode)
                .single()

            if (localProduct?.name) {
                setScanned({ barcode, name: localProduct.name, brand: localProduct.brand ?? undefined, category: localProduct.category ?? undefined })
                setProductName(localProduct.name)
                setLookup('found-local')
                return
            }
        } catch {
            // No local match, continue to API lookup
        }

        // Step 2: Try multiple APIs in parallel for best coverage of Indian products
        try {
            const apis = [
                // Open Food Facts (global)
                fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`),
                // Open Food Facts India region - better coverage for Indian products
                fetch(`https://in.openfoodfacts.org/api/v0/product/${barcode}.json`),
            ]

            const responses = await Promise.allSettled(apis)

            for (const result of responses) {
                if (result.status !== 'fulfilled') continue
                const data = await result.value.json() as {
                    status: number
                    product?: {
                        product_name?: string
                        product_name_en?: string
                        product_name_hi?: string
                        brands?: string
                        categories?: string
                        categories_tags?: string[]
                    }
                }

                if (data.status === 1 && data.product) {
                    const p = data.product
                    // Prefer English name, then Hindi transliteration, then any name
                    const name = p.product_name_en || p.product_name || p.product_name_hi || ''
                    if (!name) continue

                    const brand = p.brands?.split(',')[0]?.trim()
                    const category = p.categories?.split(',')[0]?.trim()

                    setScanned({ barcode, name, brand, category })
                    setProductName(name)
                    setLookup('found-api')
                    return
                }
            }

            // Nothing found anywhere
            setLookup('notfound')
        } catch {
            setLookup('notfound')
        }
    }

    // ─── SCANNER ────────────────────────────────────────────────────────────────
    const stopScanner = useCallback(() => {
        try { Quagga.stop() } catch { /* ignore */ }
    }, [])

    const startScanner = useCallback(() => {
        if (!scannerRef.current) return
        Quagga.init({
            inputStream: {
                type: 'LiveStream',
                target: scannerRef.current,
                constraints: { facingMode: 'environment', width: { min: 640 }, height: { min: 480 } },
            },
            decoder: { readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'] },
            locate: true,
        }, (err: unknown) => {
            if (err) { console.error(err); setMode('idle'); return }
            Quagga.start()
        })

        Quagga.onDetected((result: QuaggaJSResultObject) => {
            const code = result.codeResult.code
            if (!code) return
            stopScanner()
            setMode('form')
            setScanned({ barcode: code, name: '' })
            void lookupBarcode(code)
        })
    }, [stopScanner])

    useEffect(() => {
        if (mode === 'scanning') startScanner()
        else stopScanner()
        return () => stopScanner()
    }, [mode])

    function resetForm() {
        hasLookedUp.current = null
        setMode('idle')
        setProductName('')
        setQuantity('1')
        setExpiryDate('')
        setBatchNo('')
        setSupplierId('')
        setScanned(null)
        setLookup('idle')
        setError('')
    }

    function handleManualEntry() {
        setMode('form')
        setScanned(null)
        setLookup('idle')
        setProductName('')
    }

    // ─── SAVE ────────────────────────────────────────────────────────────────────
    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!shop || !user) return
        setError('')
        setSaving(true)

        // If we have a barcode and a name (typed or found), save it to local products
        // table so future scans of this barcode are INSTANT (local-first)
        let productId: string | null = null
        if (scanned?.barcode && productName) {
            const { data: existing } = await supabase
                .from('products')
                .select('id')
                .eq('barcode', scanned.barcode)
                .maybeSingle()

            if (existing) {
                productId = existing.id
            } else {
                // Save to local product DB (this makes next scan instant!)
                const { data: newProd } = await supabase
                    .from('products')
                    .insert({
                        barcode: scanned.barcode,
                        name: productName.trim(),
                        brand: scanned.brand || null,
                        category: scanned.category || null,
                    })
                    .select('id')
                    .single()
                productId = newProd?.id || null
            }
        }

        const { error: insertErr } = await supabase.from('stock_items').insert({
            shop_id: shop.id,
            product_id: productId,
            product_name: productName.trim(),
            quantity: parseInt(quantity) || 1,
            expiry_date: expiryDate,
            batch_no: batchNo.trim() || null,
            supplier_id: supplierId || null,
            logged_by: user.id,
            status: 'active',
        })

        setSaving(false)
        if (insertErr) { setError(insertErr.message); return }
        await fetchStock(shop.id)
        setSaved(true)
        setTimeout(() => {
            setSaved(false)
            resetForm()
        }, 1800)
    }

    // ─── SUCCESS SCREEN ──────────────────────────────────────────────────────────
    if (saved) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
            <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="w-14 h-14 text-green-500" strokeWidth={1.5} />
                <p className="text-lg font-semibold text-gray-900">Item saved!</p>
                <p className="text-sm text-gray-500">{productName} added to inventory</p>
            </div>
        </div>
    )

    // ─── SCANNING MODE ───────────────────────────────────────────────────────────
    if (mode === 'scanning') return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <span className="text-white font-medium">Scan barcode</span>
                <button onClick={() => setMode('idle')} className="text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <div ref={scannerRef} className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-64 h-32 border-2 border-white rounded-lg relative">
                        <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-green-400 rounded-tl" />
                        <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-green-400 rounded-tr" />
                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-green-400 rounded-bl" />
                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-green-400 rounded-br" />
                    </div>
                </div>
            </div>
            <p className="text-center text-white/70 text-sm py-4 bg-black/80">Point at a barcode</p>
        </div>
    )

    // ─── FORM MODE ───────────────────────────────────────────────────────────────
    if (mode === 'form') return (
        <div className="min-h-screen bg-white">
            <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-3">
                <button onClick={resetForm} className="p-1 -ml-1 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
                <h1 className="text-base font-semibold text-gray-900">Add stock item</h1>
            </div>

            {/* Lookup status banners */}
            {lookup === 'loading' && (
                <div className="mx-4 mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2.5 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    Looking up barcode…
                </div>
            )}
            {lookup === 'found-local' && (
                <div className="mx-4 mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700 border border-green-100 flex items-center gap-2">
                    <Database className="w-4 h-4 flex-shrink-0" />
                    Found in your local database — filled instantly!
                </div>
            )}
            {lookup === 'found-api' && (
                <div className="mx-4 mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700 border border-green-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Found in Open Food Facts — name auto-filled
                </div>
            )}
            {lookup === 'notfound' && (
                <div className="mx-4 mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-2.5">
                    <PackageSearch className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Product not found in any database</p>
                        <p className="text-xs text-amber-600 mt-0.5">Enter the name below — it will be saved for instant lookup next time you scan this barcode!</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="px-4 py-5 space-y-4">
                {scanned?.barcode && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Barcode</label>
                        <p className="text-sm font-mono text-gray-500 py-1">{scanned.barcode}</p>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Product name *</label>
                    <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Amul Butter 200g"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {lookup === 'notfound' && scanned?.barcode && (
                        <p className="text-xs text-amber-600 mt-1">
                            💾 Saving this will add the barcode to your local database for instant future scans.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Quantity *</label>
                        <input
                            type="number"
                            min="1"
                            required
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Expiry date *</label>
                        <input
                            type="date"
                            required
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Batch / Lot no. (optional)</label>
                    <input
                        type="text"
                        value={batchNo}
                        onChange={(e) => setBatchNo(e.target.value)}
                        placeholder="B2024-01"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Supplier (optional)</label>
                    <div className="relative">
                        <select
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">— None —</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                    type="submit"
                    disabled={saving || lookup === 'loading'}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-60 text-sm"
                >
                    {saving ? 'Saving…' : lookup === 'loading' ? 'Looking up…' : 'Save to inventory'}
                </button>
            </form>
        </div>
    )

    // ─── IDLE (LANDING) MODE ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <div className="px-4 py-5 border-b border-gray-100">
                <h1 className="text-base font-semibold text-gray-900">Scan & Log Stock</h1>
                <p className="text-xs text-gray-400 mt-0.5">Add items by scanning a barcode or manually</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                <button
                    onClick={() => setMode('scanning')}
                    className="w-full max-w-xs flex items-center justify-center gap-3 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition font-medium"
                >
                    <Camera className="w-5 h-5" />
                    Open Camera & Scan
                </button>
                <button
                    onClick={handleManualEntry}
                    className="w-full max-w-xs flex items-center justify-center gap-3 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
                >
                    Add manually
                </button>
                <div className="mt-2 text-center">
                    <p className="text-xs text-gray-400">Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                        <Database className="w-3 h-3" />
                        Scanned products are saved locally for instant re-scans
                    </p>
                </div>
            </div>
        </div>
    )
}
