import { useState, useEffect, useRef } from 'react'
import { Search, Filter, RefreshCw, Trash2, TriangleAlert } from 'lucide-react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { getDaysLeft, formatExpiry } from '../types'

type FilterStatus = 'all' | 'active' | 'returned' | 'discarded'

export default function InventoryPage() {
    const { stockItems, shop, deleteStockItem, fetchStock } = useStore()
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('active')
    const [refreshing, setRefreshing] = useState(false)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    // Realtime subscription
    useEffect(() => {
        if (!shop) return
        channelRef.current = supabase
            .channel(`stock:${shop.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items', filter: `shop_id=eq.${shop.id}` },
                () => fetchStock(shop.id)
            )
            .subscribe()
        return () => { channelRef.current?.unsubscribe() }
    }, [shop])

    async function refresh() {
        if (!shop) return
        setRefreshing(true)
        await fetchStock(shop.id)
        setRefreshing(false)
    }

    // Get all items for the selected status filter
    const baseItems = filterStatus === 'all'
        ? stockItems
        : filterStatus === 'active'
            ? stockItems  // store only fetches active
            : []   // extended statuses handled below

    const displayed = baseItems.filter(i =>
        i.product_name.toLowerCase().includes(search.toLowerCase())
    )

    const criticalItems = stockItems.filter(i => getDaysLeft(i.expiry_date) <= 1)

    function rowColor(daysLeft: number) {
        if (daysLeft < 0) return 'border-l-4 border-l-red-500 bg-red-50'
        if (daysLeft <= 1) return 'border-l-4 border-l-red-400 bg-red-50'
        if (daysLeft <= 3) return 'border-l-4 border-l-amber-400 bg-amber-50'
        if (daysLeft <= 7) return 'border-l-4 border-l-yellow-300 bg-yellow-50'
        return 'border-l-4 border-l-green-300 bg-white'
    }

    function expiryBadgeColor(daysLeft: number) {
        if (daysLeft <= 1) return 'text-red-600 bg-red-100'
        if (daysLeft <= 3) return 'text-amber-700 bg-amber-100'
        if (daysLeft <= 7) return 'text-yellow-700 bg-yellow-100'
        return 'text-green-700 bg-green-100'
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-base font-semibold text-gray-900">Inventory</h1>
                        <p className="text-xs text-gray-400">{stockItems.length} active items</p>
                    </div>
                    <button
                        onClick={refresh}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="search"
                        placeholder="Search products…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1.5">
                    {(['active', 'all'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition ${filterStatus === s
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {s === 'active' ? 'Active' : 'All'}
                        </button>
                    ))}
                    <span className="flex items-center gap-1 ml-auto text-xs text-gray-400">
                        <Filter className="w-3 h-3" />
                        Sorted by expiry
                    </span>
                </div>
            </div>

            {/* Critical banner */}
            {criticalItems.length > 0 && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <TriangleAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-700">
                            {criticalItems.length} item{criticalItems.length > 1 ? 's' : ''} expiring today or tomorrow!
                        </p>
                        <p className="text-xs text-red-500 mt-0.5">
                            {criticalItems.map(i => i.product_name).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* Items list */}
            <div className="flex-1 px-4 py-4 space-y-2">
                {displayed.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400 text-sm">No items found</p>
                        <p className="text-gray-300 text-xs mt-1">Scan or add items to get started</p>
                    </div>
                ) : displayed.map(item => {
                    const daysLeft = getDaysLeft(item.expiry_date)
                    return (
                        <div key={item.id} className={`rounded-xl p-4 flex items-start justify-between shadow-sm ${rowColor(daysLeft)}`}>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                    {item.suppliers && (
                                        <span className="text-xs text-gray-500">· {item.suppliers.name}</span>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${expiryBadgeColor(daysLeft)}`}>
                                        {formatExpiry(item.expiry_date)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteStockItem(item.id)}
                                className="ml-3 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
