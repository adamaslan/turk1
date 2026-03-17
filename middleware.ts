import { NextRequest, NextResponse } from 'next/server'

// In-memory store: ip -> { count, resetAt }
// Note: resets on server restart; use Redis/Upstash for persistent rate limiting in production
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000  // 1 minute window
const MAX_REQUESTS = 60   // supports up to 30 episodes (2 requests each: translate + audio)

function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
    )
}

export function middleware(req: NextRequest) {
    const ip = getClientIp(req)
    const now = Date.now()
    const entry = rateLimitStore.get(ip)

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS })
        return NextResponse.next()
    }

    if (entry.count >= MAX_REQUESTS) {
        return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
                },
            }
        )
    }

    entry.count++
    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
