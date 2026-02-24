import { NavLink } from 'react-router-dom'
import { Camera, List, Bell, Truck } from 'lucide-react'
import { useStore } from '../store'
import { getDaysLeft } from '../types'

const tabs = [
    { path: '/scan', icon: Camera, label: 'Scan' },
    { path: '/inventory', icon: List, label: 'Inventory' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
    { path: '/suppliers', icon: Truck, label: 'Suppliers' },
]

export default function NavBar() {
    const { stockItems } = useStore()
    const criticalCount = stockItems.filter(i => getDaysLeft(i.expiry_date) <= 1).length

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex safe-pb z-50">
            {tabs.map(({ path, icon: Icon, label }) => (
                <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                        `flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                        }`
                    }
                >
                    <div className="relative">
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                        {label === 'Alerts' && criticalCount > 0 && (
                            <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                {criticalCount > 9 ? '9+' : criticalCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-medium">{label}</span>
                </NavLink>
            ))}
        </nav>
    )
}
