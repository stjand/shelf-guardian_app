import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setError(''); setInfo('')
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) setError(error.message === 'Invalid login credentials'
            ? 'Wrong email or password. Try again.'
            : error.message)
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setError(''); setInfo('')
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
        setLoading(true)
        const { error } = await supabase.auth.signUp({ email, password })
        setLoading(false)
        if (error) { setError(error.message); return }
        setInfo('Account created! Check your email to confirm, then come back and log in.')
        setMode('login')
    }

    async function handleForgot(e: React.FormEvent) {
        e.preventDefault()
        setError(''); setInfo('')
        setLoading(true)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        setLoading(false)
        if (error) { setError(error.message); return }
        setInfo('Password reset link sent! Check your email.')
    }

    function switchMode(m: Mode) {
        setMode(m)
        setError('')
        setInfo('')
        setPassword('')
    }

    const onSubmit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot

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

                {/* Mode heading */}
                <p className="text-sm font-medium text-gray-700 mb-5 text-center">
                    {mode === 'login' && 'Sign in to your account'}
                    {mode === 'signup' && 'Create a new account'}
                    {mode === 'forgot' && 'Reset your password'}
                </p>

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Email */}
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

                    {/* Password (not shown in forgot mode) */}
                    {mode !== 'forgot' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error / Info */}
                    {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                    {info && <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{info}</p>}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
                    >
                        {loading
                            ? 'Please wait…'
                            : mode === 'login' ? 'Sign in'
                                : mode === 'signup' ? 'Create account'
                                    : 'Send reset link'}
                    </button>
                </form>

                {/* Footer links */}
                <div className="mt-5 flex flex-col gap-2 text-center">
                    {mode === 'login' && (
                        <>
                            <button onClick={() => switchMode('forgot')} className="text-xs text-gray-400 hover:text-gray-600 transition">
                                Forgot password?
                            </button>
                            <button onClick={() => switchMode('signup')} className="text-sm text-green-600 hover:text-green-700 font-medium transition">
                                Don't have an account? Sign up
                            </button>
                        </>
                    )}
                    {(mode === 'signup' || mode === 'forgot') && (
                        <button onClick={() => switchMode('login')} className="text-sm text-green-600 hover:text-green-700 font-medium transition">
                            ← Back to sign in
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
