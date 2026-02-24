import { create } from 'zustand'
import { supabase } from './lib/supabase'
import type { Shop, StockItem, Supplier } from './types'
import type { User } from '@supabase/supabase-js'

interface AppState {
    user: User | null
    shop: Shop | null
    stockItems: StockItem[]
    suppliers: Supplier[]
    loading: boolean
    setUser: (user: User | null) => void
    setShop: (shop: Shop | null) => void
    setStockItems: (items: StockItem[]) => void
    setSuppliers: (suppliers: Supplier[]) => void
    setLoading: (v: boolean) => void
    fetchShop: (userId: string) => Promise<void>
    fetchStock: (shopId: string) => Promise<void>
    fetchSuppliers: (shopId: string) => Promise<void>
    updateStockStatus: (id: string, status: string) => Promise<void>
    deleteStockItem: (id: string) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
    user: null,
    shop: null,
    stockItems: [],
    suppliers: [],
    loading: false,

    setUser: (user) => set({ user }),
    setShop: (shop) => set({ shop }),
    setStockItems: (items) => set({ stockItems: items }),
    setSuppliers: (suppliers) => set({ suppliers }),
    setLoading: (v) => set({ loading: v }),

    fetchShop: async (userId) => {
        const { data } = await supabase
            .from('shops')
            .select('*')
            .eq('owner_id', userId)
            .single()
        set({ shop: data || null })
    },

    fetchStock: async (shopId) => {
        const { data } = await supabase
            .from('stock_items')
            .select('*, suppliers(name, phone)')
            .eq('shop_id', shopId)
            .eq('status', 'active')
            .order('expiry_date', { ascending: true })
        set({ stockItems: data || [] })
    },

    fetchSuppliers: async (shopId) => {
        const { data } = await supabase
            .from('suppliers')
            .select('*')
            .eq('shop_id', shopId)
            .order('name')
        set({ suppliers: data || [] })
    },

    updateStockStatus: async (id, status) => {
        await supabase
            .from('stock_items')
            .update({ status, resolved_at: status !== 'active' ? new Date().toISOString() : null })
            .eq('id', id)
        // Refetch
        const { shop } = get()
        if (shop) get().fetchStock(shop.id)
    },

    deleteStockItem: async (id) => {
        await supabase.from('stock_items').delete().eq('id', id)
        set((s) => ({ stockItems: s.stockItems.filter((i) => i.id !== id) }))
    },
}))
