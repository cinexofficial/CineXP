'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getImageUrl } from '@/lib/tmdb'
import { VscSearch } from 'react-icons/vsc'

interface SearchResult {
  id: number
  media_type: string
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
}

interface AdminSearchProps {
  onSelect: (item: SearchResult) => void
  placeholder?: string
  autoFocus?: boolean
}

export default function AdminSearch({ onSelect, placeholder = 'Search movies & TV shows...', autoFocus = false }: AdminSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const searchTMDB = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      if (!controller.signal.aborted) {
        setResults(data.results || [])
        setIsOpen(true)
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setResults([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchTMDB(value), 300)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const handleSelect = (item: SearchResult) => {
    onSelect(item)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="admin-search-wrapper" ref={wrapperRef}>
      <div className="admin-search-icon">
        <VscSearch size={16} />
      </div>
      <input
        type="text"
        className="admin-search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        autoFocus={autoFocus}
      />
      {isOpen && (
        <div className="admin-search-results">
          {isLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
              No results found
            </div>
          ) : (
            results.slice(0, 10).map((item) => {
              const title = item.title || item.name || 'Unknown'
              const year = (item.release_date || item.first_air_date || '').split('-')[0]
              const type = item.media_type === 'tv' ? 'TV' : 'Movie'
              return (
                <div
                  key={`${item.media_type}-${item.id}`}
                  className="admin-search-item"
                  onClick={() => handleSelect(item)}
                >
                  {item.poster_path ? (
                    <img src={getImageUrl(item.poster_path, 'w92')} alt={title} />
                  ) : (
                    <div style={{ width: 40, height: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', opacity: 0.4 }}>
                      N/A
                    </div>
                  )}
                  <div className="admin-search-item-info">
                    <h4>{title}</h4>
                    <p>
                      {year && `${year} · `}
                      <span className={`admin-badge admin-badge-${item.media_type}`}>{type}</span>
                      {item.vote_average ? ` · ⭐ ${item.vote_average.toFixed(1)}` : ''}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
