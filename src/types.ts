export type AlertStatus = 'active' | 'returned' | 'discarded' | 'sold'

export interface Shop {
    id: string
    owner_id: string
    name: string
    location: string | null
    created_at: string
}

export interface Product {
    id: string
    barcode: string | null
    name: string
    brand: string | null
    category: string | null
    created_at: string
}

export interface Supplier {
    id: string
    shop_id: string
    name: string
    phone: string | null
    created_at: string
}

export interface StockItem {
    id: string
    shop_id: string
    product_id: string | null
    product_name: string
    quantity: number
    expiry_date: string        // 'YYYY-MM-DD'
    batch_no: string | null
    status: AlertStatus
    supplier_id: string | null
    logged_by: string | null
    created_at: string
    resolved_at: string | null
    // joined
    suppliers?: { name: string; phone: string | null } | null
}

export interface PushSubscription {
    id: string
    user_id: string
    subscription: object
    created_at: string
}

export type UrgencyTier = 'critical' | 'warning' | 'watch'

export function getUrgencyTier(daysLeft: number): UrgencyTier {
    if (daysLeft <= 1) return 'critical'
    if (daysLeft <= 3) return 'warning'
    return 'watch'
}

export function getDaysLeft(expiryDate: string): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatExpiry(expiryDate: string): string {
    const days = getDaysLeft(expiryDate)
    if (days < 0) return `Expired ${Math.abs(days)}d ago`
    if (days === 0) return 'Expires today'
    if (days === 1) return 'Expires tomorrow'
    return `${days} days left`
}
