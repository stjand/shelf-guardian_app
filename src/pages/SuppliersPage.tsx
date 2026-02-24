import { useState } from 'react'
import { Plus, Phone, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

export default function SuppliersPage() {
    const { suppliers, shop, fetchSuppliers } = useStore()
    const [showForm, setShowForm] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        if (!shop) return
        setError(''); setSaving(true)
        const { error } = await supabase.from('suppliers').insert({
            shop_id: shop.id,
            name: name.trim(),
            phone: phone.trim() || null,
        })
        setSaving(false)
        if (error) { setError(error.message); return }
        setName(''); setPhone(''); setShowForm(false)
        fetchSuppliers(shop.id)
    }

    async function handleDelete(id: string) {
        await supabase.from('suppliers').delete().eq('id', id)
        if (shop) fetchSuppliers(shop.id)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h1 className="text-base font-semibold text-gray-900">Suppliers</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{suppliers.length} contacts</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                </button>
            </div>

            <div className="flex-1 px-4 py-4 space-y-2">
                {suppliers.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400 text-sm">No suppliers yet</p>
                        <p className="text-gray-300 text-xs mt-1">Add supplier contacts to enable WhatsApp returns</p>
                    </div>
                ) : suppliers.map(s => (
                    <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 shadow-sm">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 flex-shrink-0">
                            {s.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                            {s.phone && (
                                <p className="text-xs text-gray-400 mt-0.5">{s.phone}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {s.phone && (
                                <a
                                    href={`https://wa.me/91${s.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition"
                                >
                                    <Phone className="w-4 h-4" />
                                </a>
                            )}
                            <button
                                onClick={() => handleDelete(s.id)}
                                className="p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add supplier bottom sheet */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowForm(false)}>
                    <div className="bg-white w-full rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <p className="text-base font-semibold text-gray-900">Add supplier</p>
                            <button onClick={() => setShowForm(false)} className="p-1 text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Sharma Distributors"
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Phone (for WhatsApp)</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="9876543210"
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                            {error && <p className="text-xs text-red-500">{error}</p>}
                            <button
                                type="submit"
                                disabled={saving || !name.trim()}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
                            >
                                {saving ? 'Adding…' : 'Add supplier'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
