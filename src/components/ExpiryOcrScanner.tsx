import { useRef, useState, useCallback, useEffect } from 'react'
import { createWorker } from 'tesseract.js'
import { ScanText, X, RotateCcw, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface ExpiryOcrScannerProps {
    onDateDetected: (isoDate: string) => void
    onClose: () => void
}

type ScanState = 'preview' | 'scanning' | 'found' | 'not-found'

// ─── Date Parsing Helpers ─────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

/** Normalise a raw year string: 2-digit → 4-digit */
function normaliseYear(y: string): string {
    if (y.length === 4) return y
    const n = parseInt(y)
    return n < 50 ? `20${y.padStart(2, '0')}` : `19${y.padStart(2, '0')}`
}

/** All the patterns we try, in order of confidence */
const DATE_PATTERNS: Array<(text: string) => string | null> = [
    // Best BY / EXP / USE BY / BB / MFG labels (strip them first)
    // Then apply patterns...

    // MM/YYYY  or  MM-YYYY  (indian style: no day, month-year)
    (text) => {
        const m = text.match(/\b(0?[1-9]|1[0-2])[\/\-](20\d{2}|[2-9]\d)\b/)
        if (!m) return null
        const month = m[1].padStart(2, '0')
        const year = normaliseYear(m[2])
        return `${year}-${month}-01`
    },

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    (text) => {
        const m = text.match(/\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d{2}|[2-9]\d)\b/)
        if (!m) return null
        const day = m[1].padStart(2, '0')
        const month = m[2].padStart(2, '0')
        const year = normaliseYear(m[3])
        return `${year}-${month}-${day}`
    },

    // DD MMM YYYY or DD-MMM-YYYY  e.g. 12 JAN 2025
    (text) => {
        const m = text.match(/\b(0?[1-9]|[12]\d|3[01])[\s\-\/]*([a-zA-Z]{3})[\s\-\/]*(20\d{2}|[2-9]\d)\b/)
        if (!m) return null
        const day = m[1].padStart(2, '0')
        const month = MONTH_MAP[m[2].toLowerCase()]
        if (!month) return null
        const year = normaliseYear(m[3])
        return `${year}-${month}-${day}`
    },

    // MMM YYYY  e.g. JAN 2025
    (text) => {
        const m = text.match(/\b([a-zA-Z]{3})[\s\-\/]*(20\d{2}|[2-9]\d)\b/)
        if (!m) return null
        const month = MONTH_MAP[m[1].toLowerCase()]
        if (!month) return null
        const year = normaliseYear(m[2])
        return `${year}-${month}-01`
    },

    // YYYY/MM/DD or YYYY-MM-DD
    (text) => {
        const m = text.match(/\b(20\d{2})[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/)
        if (!m) return null
        const year = m[1]
        const month = m[2].padStart(2, '0')
        const day = m[3].padStart(2, '0')
        return `${year}-${month}-${day}`
    },

    // MMYY or MMYYYY (compact, common on caps)
    (text) => {
        const m = text.match(/\b(0[1-9]|1[0-2])(\d{2}|\d{4})\b/)
        if (!m) return null
        const month = m[1]
        const year = normaliseYear(m[2])
        // Guard: don't match random 4-digit codes
        const yr = parseInt(year)
        if (yr < 2020 || yr > 2040) return null
        return `${year}-${month}-01`
    },
]

/** Strip common label prefixes to reduce noise, then try all patterns */
function extractExpiryDate(rawText: string): string | null {
    // Focus on lines that contain date-related keywords
    const lines = rawText.split(/\n+/)
    const relevant = lines.filter(l =>
        /exp|best|use|bb|mfd|mfg|manufacture|date|before|by|valid|upto|до/i.test(l) || /\d{2}/.test(l)
    )

    // Try relevant lines first, then full text
    const candidates = [...relevant, rawText]

    for (const candidate of candidates) {
        // Remove noise chars but keep alphanumeric, spaces, separators
        const cleaned = candidate.replace(/[^a-zA-Z0-9\/\-\.\s]/g, ' ').replace(/\s{2,}/g, ' ')
        for (const pattern of DATE_PATTERNS) {
            const result = pattern(cleaned)
            if (result) return result
        }
    }
    return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpiryOcrScanner({ onDateDetected, onClose }: ExpiryOcrScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null)

    const [state, setState] = useState<ScanState>('preview')
    const [detectedDate, setDetectedDate] = useState<string | null>(null)
    const [rawText, setRawText] = useState<string>('')
    const [statusMsg, setStatusMsg] = useState('Point camera at the expiry date printed on the package')

    // ── Camera start ─────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
        } catch (err) {
            console.error('Camera error:', err)
        }
    }, [])

    // ── Camera stop ──────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])

    // ── OCR worker init ──────────────────────────────────────────────────────
    const initWorker = useCallback(async () => {
        if (workerRef.current) return
        const worker = await createWorker('eng', 1, {
            // PSM 11 = sparse text (works well for labels)
        })
        await worker.setParameters({ tessedit_pageseg_mode: '11' as never })
        workerRef.current = worker
    }, [])

    // ── Capture & OCR ────────────────────────────────────────────────────────
    const captureAndScan = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return
        setState('scanning')
        setStatusMsg('Reading text… please hold still')

        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0)

        // Pre-process: greyscale + contrast boost for better OCR on labels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
            const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            // Threshold: high contrast black/white
            const val = grey > 150 ? 255 : 0
            data[i] = data[i + 1] = data[i + 2] = val
        }
        ctx.putImageData(imageData, 0, 0)

        try {
            await initWorker()
            const { data: { text } } = await workerRef.current!.recognize(canvas)
            setRawText(text.trim())

            const parsed = extractExpiryDate(text)
            if (parsed) {
                setDetectedDate(parsed)
                setState('found')
                setStatusMsg('Expiry date detected!')
            } else {
                setState('not-found')
                setStatusMsg('Couldn\'t read a date. Try again with better lighting.')
            }
        } catch (err) {
            console.error('OCR error:', err)
            setState('not-found')
            setStatusMsg('OCR failed. Please try again.')
        }
    }, [initWorker])

    // ── Reset to preview ─────────────────────────────────────────────────────
    const retry = useCallback(() => {
        setState('preview')
        setDetectedDate(null)
        setRawText('')
        setStatusMsg('Point camera at the expiry date printed on the package')
    }, [])

    // ── Accept detected date ─────────────────────────────────────────────────
    const acceptDate = useCallback(() => {
        if (detectedDate) {
            onDateDetected(detectedDate)
        }
        stopCamera()
    }, [detectedDate, onDateDetected, stopCamera])

    // ── Lifecycle ────────────────────────────────────────────────────────────
    useEffect(() => {
        startCamera()
        return () => {
            stopCamera()
            workerRef.current?.terminate().catch(() => { })
            workerRef.current = null
        }
    }, [startCamera, stopCamera])

    const handleClose = useCallback(() => {
        stopCamera()
        onClose()
    }, [stopCamera, onClose])

    // ── Format date for display ──────────────────────────────────────────────
    const formatDisplay = (iso: string) => {
        const [y, m, d] = iso.split('-')
        return `${d}/${m}/${y}`
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <div className="flex items-center gap-2">
                    <ScanText className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium text-sm">Scan Expiry Date</span>
                </div>
                <button onClick={handleClose} className="text-white/70 hover:text-white p-1 transition">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Video viewfinder */}
            <div className="flex-1 relative overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scan guide overlay */}
                {(state === 'preview' || state === 'scanning') && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Dimmed surround */}
                        <div className="absolute inset-0 bg-black/40" />
                        {/* Target box */}
                        <div
                            className="relative z-10 border-2 border-purple-400 rounded-lg"
                            style={{ width: '80%', maxWidth: 360, height: 90 }}
                        >
                            {/* Corner markers */}
                            <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-purple-400 rounded-tl-sm" />
                            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-purple-400 rounded-tr-sm" />
                            <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-purple-400 rounded-bl-sm" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-purple-400 rounded-br-sm" />

                            {/* Scanning animation */}
                            {state === 'scanning' && (
                                <div
                                    className="absolute left-0 right-0 h-0.5 bg-purple-400 opacity-80 rounded-full animate-scan-line"
                                    style={{ top: '50%' }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Result overlay */}
                {state === 'found' && detectedDate && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4 px-6">
                        <div className="bg-white rounded-2xl px-6 py-5 w-full max-w-xs text-center shadow-2xl">
                            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Expiry Date Found</p>
                            <p className="text-3xl font-bold text-gray-900 font-mono">{formatDisplay(detectedDate)}</p>
                            {rawText && (
                                <p className="text-xs text-gray-400 mt-2 italic truncate" title={rawText}>
                                    OCR: {rawText.replace(/\n/g, ' ').slice(0, 60)}
                                </p>
                            )}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={retry}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-gray-50 transition"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Retry
                                </button>
                                <button
                                    onClick={acceptDate}
                                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition"
                                >
                                    Use this date
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Not found overlay */}
                {state === 'not-found' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4 px-6">
                        <div className="bg-white rounded-2xl px-6 py-5 w-full max-w-xs text-center shadow-2xl">
                            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-gray-900 mb-1">Date not detected</p>
                            <p className="text-xs text-gray-500">Make sure the expiry date is clearly visible inside the frame. Try better lighting or hold the camera closer.</p>
                            {rawText && (
                                <p className="text-xs text-gray-400 mt-2 italic">Read: "{rawText.slice(0, 80)}"</p>
                            )}
                            <button
                                onClick={retry}
                                className="mt-4 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Try again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom bar */}
            <div className="bg-black/80 px-4 py-4 flex flex-col items-center gap-3">
                <p className="text-white/60 text-xs text-center max-w-xs">{statusMsg}</p>
                {state === 'preview' && (
                    <button
                        onClick={captureAndScan}
                        className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 active:scale-95 transition flex items-center justify-center shadow-lg shadow-purple-500/30"
                    >
                        <ScanText className="w-7 h-7 text-white" />
                    </button>
                )}
                {state === 'scanning' && (
                    <div className="flex items-center gap-2 text-purple-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Running OCR…</span>
                    </div>
                )}
            </div>

            {/* Scanning animation keyframes */}
            <style>{`
                @keyframes scan-line {
                    0%   { top: 5%; opacity: 1; }
                    50%  { top: 90%; opacity: 0.8; }
                    100% { top: 5%; opacity: 1; }
                }
                .animate-scan-line {
                    animation: scan-line 1.4s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
