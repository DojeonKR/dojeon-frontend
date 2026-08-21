import { useEffect } from 'react'
import {
  generateIdempotencyKey,
  saveSectionProgress,
} from '../services/section.service.ts'

const FLUSH_INTERVAL_MS = 15_000

interface SectionPageTimerOptions {
  sectionId: number | null
  pageNumber: number
  enabled?: boolean
}

export function useSectionPageTimer({
  sectionId,
  pageNumber,
  enabled = true,
}: SectionPageTimerOptions) {
  useEffect(() => {
    if (!enabled || sectionId === null || sectionId < 0 || pageNumber < 0) return

    let lastFlushAt = Date.now()

    const flush = () => {
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - lastFlushAt) / 1000)
      if (elapsedSeconds < 1) return

      lastFlushAt += elapsedSeconds * 1000
      void saveSectionProgress(
        sectionId,
        {
          currentPage: pageNumber + 1,
          isCompleted: false,
          stayTimeSeconds: elapsedSeconds,
        },
        generateIdempotencyKey(),
      ).catch(() => {
        // A later interval/page transition will continue tracking without blocking navigation.
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    const intervalId = window.setInterval(flush, FLUSH_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flush()
    }
  }, [enabled, pageNumber, sectionId])
}
