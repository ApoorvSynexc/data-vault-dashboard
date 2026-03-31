import { useEffect, useState } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useFetch<T>(fetchFn: () => Promise<T>) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: null })
    fetchFn()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch((err: Error) => { if (!cancelled) setState({ data: null, loading: false, error: err.message }) })
    return () => { cancelled = true }
  }, [])

  return state
}
