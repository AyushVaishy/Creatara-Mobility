import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import type { ApiResponse } from '@/types'

export async function GET() {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting']

  const body: ApiResponse<{ status: string; db: string; timestamp: string }> = {
    success: true,
    data: {
      status:    'ok',
      db:        dbState[mongoose.connection.readyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(body)
}
