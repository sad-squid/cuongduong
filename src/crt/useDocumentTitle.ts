import { useEffect } from 'react'

export const useDocumentTitle = (title: string | null) => {
  useEffect(() => {
    document.title = title ? `${title} · Cuong Duong` : 'Cuong Duong'
  }, [title])
}
