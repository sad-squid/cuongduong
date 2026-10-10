import { useEffect } from 'react'
import { useCrt } from './context'

export const useReveal = () => {
  const crt = useCrt()
  useEffect(() => {
    crt.reveal()
  }, [crt])
}
