import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'
import { Store } from 'lucide-react'

export default function OnboardPage() {
    const { user, fetchShop } = useStore()
    const [shopName, setShopName] = useState('')
    const [location, setLocation] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!user) return
        setError('')
        setLoading(true)
        const { error } = await supabase.from('shops').insert({
            owner_id: user.id,
            name: shopName.trim(),
            location: location.trim() || null,
        })
        setLoading(false)
        if (error) { setError(error.message); return }
        fetchShop(user.id)
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mb-4">
                        <Store className="w-7 h-7 text-green-600" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Set up your shop</h1>
                    <p className="text-sm text-gray-500 mt-1 text-center">Just one step before you start tracking</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            Shop name *
                        </label>
                        <input
                            type="text"
                            required
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            placeholder="Rajan General Store"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            Location (optional)
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Andheri West, Mumbai"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading || !shopName.trim()}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
                    >
                        {loading ? 'Creating...' : 'Create shop →'}
                    </button>
                </form>
            </div>
        </div>
    )
}
