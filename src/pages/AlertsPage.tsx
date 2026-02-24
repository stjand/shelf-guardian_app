import { useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Clock, Inbox } from 'lucide-react'
import { useStore } from '../store'
import { getDaysLeft, formatExpiry, getUrgencyTier } from '../types'

type ActionModal = { id: string; name: string } | null

export default function AlertsPage() {
    const { stockItems, updateStockStatus } = useStore()
    const [modal, setModal] = useState<ActionModal>(null)
    const [resolving, setResolving] = useState(false)

    // Only active items within 7 days or expired
    const expiring = stockItems.filter(i => getDaysLeft(i.expiry_date) <= 7)

    const critical = expiring.filter(i => getUrgencyTier(getDaysLeft(i.expiry_date)) === 'critical')
    const warning = expiring.filter(i => getUrgencyTier(getDaysLeft(i.expiry_date)) === 'warning')
    const watch = expiring.filter(i => getUrgencyTier(getDaysLeft(i.expiry_date)) === 'watch')

    async function resolve(status: 'returned' | 'discarded') {
        if (!modal) return
        setResolving(true)
        await updateStockStatus(modal.id, status)
        setResolving(false)
        setModal(null)
    }

    function AlertItem({ item }: { item: typeof stockItems[0] }) {
        const daysLeft = getDaysLeft(item.expiry_date)
        const tier = getUrgencyTier(daysLeft)
        const colors = {
            critical: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
            warning: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
            watch: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
        }[tier]

        return (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                            {formatExpiry(item.expiry_date)}
                        </span>
                        <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                        {item.suppliers && item.suppliers.phone && (
                            <a
                                href={`https://wa.me/91${item.suppliers.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 underline"
                            >
                                WhatsApp supplier
                            </a>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setModal({ id: item.id, name: item.product_name })}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition"
                >
                    <CheckCircle2 className="w-4 h-4" />
                </button>
            </div>
        )
    }

    function TierSection({ title, icon, items, emptyLabel }: { title: string; icon: React.ReactNode; items: typeof stockItems; emptyLabel: string }) {
        return (
            <div>
                <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</h2>
                    <span className="ml-auto text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                {items.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2 pl-1">{emptyLabel}</p>
                ) : (
                    <div className="space-y-2">
                        {items.map(item => <AlertItem key={item.id} item={item} />)}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
                <h1 className="text-base font-semibold text-gray-900">Alerts</h1>
                <p className="text-xs text-gray-400 mt-0.5">Items expiring in the next 7 days</p>
            </div>

            <div className="flex-1 px-4 py-5 space-y-6">
                {expiring.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Inbox className="w-10 h-10 text-gray-300" />
                        <p className="text-sm text-gray-400 font-medium">All clear!</p>
                        <p className="text-xs text-gray-300 text-center">No items expiring in the next 7 days</p>
                    </div>
                ) : (
                    <>
                        <TierSection
                            title="Critical — expires today or tomorrow"
                            icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                            items={critical}
                            emptyLabel="No critical items ✓"
                        />
                        <TierSection
                            title="Warning — expires in 2–3 days"
                            icon={<Clock className="w-4 h-4 text-amber-500" />}
                            items={warning}
                            emptyLabel="No warning items"
                        />
                        <TierSection
                            title="Watch — expires in 4–7 days"
                            icon={<Clock className="w-4 h-4 text-yellow-500" />}
                            items={watch}
                            emptyLabel="No watch items"
                        />
                    </>
                )}
            </div>

            {/* Resolve modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setModal(null)}>
                    <div className="bg-white w-full rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-1">Resolve item</p>
                        <p className="text-base font-semibold text-gray-900 mb-5">{modal.name}</p>
                        <div className="space-y-2">
                            <button
                                onClick={() => resolve('returned')}
                                disabled={resolving}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm font-medium text-gray-700 disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Returned to supplier
                            </button>
                            <button
                                onClick={() => resolve('discarded')}
                                disabled={resolving}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm font-medium text-gray-700 disabled:opacity-50"
                            >
                                <XCircle className="w-5 h-5 text-red-400" />
                                Discarded / thrown away
                            </button>
                        </div>
                        <button onClick={() => setModal(null)} className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-gray-600">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
