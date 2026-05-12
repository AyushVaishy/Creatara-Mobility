import cron, { type ScheduledTask } from 'node-cron'
import type { CronJobStatus, CronJobName } from '@/types'
import { collectAllCities } from './cityDataCollector'
import { logger } from '@/lib/utils/logger'

// ─── In-memory job state ──────────────────────────────────────────────────────

interface JobState {
  task: ScheduledTask
  status: CronJobStatus
}

/** Module-level singleton map — survives across Next.js hot reloads in dev */
const globalForCron = global as typeof global & {
  __cronJobs?: Map<CronJobName, JobState>
  __cronInitialized?: boolean
}

function getJobMap(): Map<CronJobName, JobState> {
  if (!globalForCron.__cronJobs) {
    globalForCron.__cronJobs = new Map()
  }
  return globalForCron.__cronJobs
}

// ─── Schedule definitions ─────────────────────────────────────────────────────

const JOB_SCHEDULES: Record<CronJobName, string> = {
  'city-data-collector': '*/30 * * * *', // every 30 minutes
}

// ─── Job runner wrapper ───────────────────────────────────────────────────────

async function runJob(name: CronJobName): Promise<void> {
  const jobs = getJobMap()
  const job  = jobs.get(name)
  if (!job) return

  if (job.status.running) {
    logger.warn(`Job ${name} is already running — skipping overlap`, 'cronScheduler')
    return
  }

  const start = Date.now()
  job.status.running   = true
  job.status.totalRuns += 1

  try {
    logger.info(`Cron job [${name}] started`, 'cronScheduler')

    if (name === 'city-data-collector') {
      const summary = await collectAllCities()
      logger.info(
        `Cron job [${name}] completed — ${summary.successfulCities}/${summary.totalCities} cities in ${summary.durationMs}ms`,
        'cronScheduler',
      )
    }

    job.status.successfulRuns   += 1
    job.status.lastError         = null
  } catch (err) {
    const message = (err as Error)?.message ?? 'unknown error'
    job.status.lastError = message
    logger.error(`Cron job [${name}] failed: ${message}`, 'cronScheduler', err)
  } finally {
    job.status.running           = false
    job.status.lastRunAt         = new Date().toISOString()
    job.status.lastRunDurationMs = Date.now() - start
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialises all cron jobs.
 *
 * Safe to call multiple times — uses a module-level flag to prevent
 * duplicate registration during Next.js hot reloads in development.
 */
export function initCronJobs(): void {
  if (globalForCron.__cronInitialized) {
    logger.debug('Cron jobs already initialised — skipping', 'cronScheduler')
    return
  }

  const jobs = getJobMap()

  for (const [name, schedule] of Object.entries(JOB_SCHEDULES) as [CronJobName, string][]) {
    if (!cron.validate(schedule)) {
      logger.error(`Invalid cron schedule for [${name}]: "${schedule}"`, 'cronScheduler')
      continue
    }

    const task = cron.schedule(schedule, () => void runJob(name), {
      timezone: 'UTC',
      noOverlap: false, // handled manually via the running flag above
    })

    jobs.set(name, {
      task,
      status: {
        name,
        schedule,
        running:           false,
        lastRunAt:         null,
        lastRunDurationMs: null,
        lastError:         null,
        totalRuns:         0,
        successfulRuns:    0,
      },
    })

    logger.info(`Cron job [${name}] registered (schedule: "${schedule}")`, 'cronScheduler')
  }

  globalForCron.__cronInitialized = true
  logger.info(`${jobs.size} cron job(s) initialised`, 'cronScheduler')
}

/** Returns the current status of all registered cron jobs. */
export function getCronStatus(): CronJobStatus[] {
  return Array.from(getJobMap().values()).map((j) => j.status)
}

/** Stops all cron jobs (useful for graceful shutdown). */
export function stopAllCronJobs(): void {
  for (const [name, job] of getJobMap().entries()) {
    job.task.stop()
    logger.info(`Cron job [${name}] stopped`, 'cronScheduler')
  }
  globalForCron.__cronInitialized = false
  getJobMap().clear()
}

/** Manually triggers a job by name (used by the test endpoint). */
export async function triggerJob(name: CronJobName): Promise<void> {
  return runJob(name)
}
