import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldCheck } from 'lucide-react'

type Step = 'email' | 'otp'

export default function LoginPage() {
    const [step, setStep] = useState<Step>('email')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSendOtp(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({ email })
        setLoading(false)
        if (error) { setError(error.message); return }
        setStep('otp')
    }

    async function handleVerifyOtp(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
        setLoading(false)
        if (error) setError(error.message)
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mb-4">
                        <ShieldCheck className="w-7 h-7 text-green-600" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">ShelfGuard</h1>
                    <p className="text-sm text-gray-500 mt-1">Inventory expiry tracker</p>
                </div>

                {step === 'email' ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="rajan@example.com"
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                            />
                        </div>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
                        >
                            {loading ? 'Sending...' : 'Send verification code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
                            </p>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                Verification code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 text-center tracking-widest font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                            />
                        </div>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
                        >
                            {loading ? 'Verifying...' : 'Verify & Sign in'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep('email'); setOtp(''); setError('') }}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            Use a different email
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
