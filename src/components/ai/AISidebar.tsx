'use client'

import { useState, useCallback } from 'react'
import { Sparkles, RefreshCw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalysisMode } from '@/lib/ai/prompts'

const MODES: { key: AnalysisMode; label: string; description: string }[] = [
  { key: 'weekly', label: 'Weekly', description: 'This week in numbers' },
  { key: 'root-cause', label: 'Root Cause', description: 'Why did weight change?' },
  { key: 'recommendations', label: 'Actions', description: 'What to do next' },
  { key: 'narrative', label: 'Story', description: '30-day arc' },
]

export function AISidebar() {
  const [mode, setMode] = useState<AnalysisMode>('weekly')
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const analyze = useCallback(
    async (selectedMode: AnalysisMode) => {
      setLoading(true)
      setError(null)
      setText('')
      try {
        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: selectedMode }),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setError(json.error ?? 'Analysis failed')
          return
        }

        const reader = res.body?.getReader()
        if (!reader) { setError('Stream unavailable'); return }

        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setText((prev) => prev + decoder.decode(value, { stream: true }))
        }
        setHasLoaded(true)
      } catch {
        setError('Failed to connect. Check your API key.')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  function selectMode(m: AnalysisMode) {
    setMode(m)
    setText('')
    setError(null)
    setHasLoaded(false)
  }

  return (
    <aside className="flex h-full w-72 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">AI Insights</span>
      </div>

      {/* Mode tabs */}
      <div className="border-b p-2">
        <div className="grid grid-cols-2 gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => selectMode(m.key)}
              className={cn(
                'rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                mode === m.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <div className="font-medium">{m.label}</div>
              <div className={cn('truncate text-[10px]', mode === m.key ? 'opacity-80' : 'opacity-60')}>
                {m.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {!hasLoaded && !loading && !error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {MODES.find((m) => m.key === mode)?.description}
            </p>
            <button
              onClick={() => analyze(mode)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Analyze
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-muted"
                style={{ width: `${75 + Math.random() * 20}%` }}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {text && !loading && (
          <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">{text}</p>
        )}
      </div>

      {/* Footer: regenerate */}
      {(hasLoaded || error) && (
        <div className="border-t p-3">
          <button
            onClick={() => analyze(mode)}
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            Regenerate
          </button>
        </div>
      )}
    </aside>
  )
}
