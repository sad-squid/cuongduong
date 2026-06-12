import { useState, useEffect } from 'react'
import { DateTime } from 'luxon'

export function useTokyoTime() {
  const [time, setTime] = useState(() =>
    DateTime.now().setZone('Asia/Tokyo').toFormat('HH:mm'),
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(DateTime.now().setZone('Asia/Tokyo').toFormat('HH:mm'))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  return time
}
