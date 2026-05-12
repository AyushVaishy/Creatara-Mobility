/**
 * Next.js Instrumentation Hook
 *
 * This file runs ONCE when the Next.js server process starts.
 * It is the correct place to initialize background jobs (cron, workers, etc.)
 * because it runs in the Node.js runtime — not during static generation.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only initialise cron jobs in the Node.js server runtime (not Edge or
  // during static pre-rendering where timers would be meaningless).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCronJobs } = await import('@/lib/cron')
    initCronJobs()
  }
}
