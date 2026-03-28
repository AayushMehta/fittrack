/**
 * Device adapter interface for wearable / health app data ingestion.
 *
 * Each adapter transforms a device-specific export payload into
 * DailyLog-compatible entries that can be bulk-imported.
 *
 * Implemented adapters:
 *   - apple-health  (src/lib/devices/apple-health.ts)
 *   - fitbit        (src/lib/devices/fitbit.ts)
 */

import type { DailyLogOutput } from '@/lib/validations/daily-log'

/** A normalised device adapter that turns raw export payloads into DailyLog rows. */
export interface DeviceAdapter {
  readonly name: string
  /** Parse a raw payload and return valid DailyLog entries. Invalid rows are silently skipped. */
  parse(payload: unknown): DailyLogOutput[]
}

/** Summary returned after a bulk import completes. */
export interface ImportResult {
  /** Number of rows successfully written to DailyLog. */
  imported: number
  /** Rows that were skipped (duplicates or parse failures). */
  skipped: number
  /** Human-readable error messages for any unexpected failures. */
  errors: string[]
}
