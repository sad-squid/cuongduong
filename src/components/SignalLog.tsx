import { useSyncExternalStore } from 'react'
import type { LogStore } from '@/crt/LogStore'

export const SignalLog = ({ store }: { store: LogStore }) => {
  const lines = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return (
    <div className="signal-log" aria-hidden="true">
      {lines.map((line) => (
        <div key={line.key} className={line.human ? 'line human' : 'line'} style={{ opacity: line.opacity }}>
          {line.text}
        </div>
      ))}
    </div>
  )
}
