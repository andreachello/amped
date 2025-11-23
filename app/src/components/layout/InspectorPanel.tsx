import { ReactNode } from 'react'

interface InspectorPanelProps {
  isOpen: boolean
  onToggle: () => void
  children?: ReactNode
}

export function InspectorPanel({ isOpen, onToggle, children }: InspectorPanelProps) {
  if (!isOpen) return null

  return (
    <div className="h-full w-full flex flex-col border-l border-[var(--ide-border-default)] bg-[var(--ide-sidebar-bg)]">
      {/* Inspector Header */}
      <div className="flex-shrink-0 h-10 flex items-center justify-between px-3 border-b border-[var(--ide-border-default)]">
        <h2 className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
          INSPECTOR
        </h2>
        <button
          onClick={onToggle}
          className="text-[var(--ide-text-muted)] hover:text-[var(--ide-text-primary)] transition-colors"
          title="Close Inspector"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Inspector Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0">
        {children}
      </div>
    </div>
  )
}
