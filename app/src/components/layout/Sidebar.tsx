import { ReactNode } from 'react'
import type { ActivityView } from './ActivityBar'

interface SidebarProps {
  activeView: ActivityView
  isOpen: boolean
  onToggle: () => void
  children?: ReactNode
}

const viewTitles: Record<ActivityView, string> = {
  explorer: 'EXPLORER',
  deployments: 'DEPLOYMENT HISTORY',
  contract: 'CONTRACT INTERFACE',
  sql: 'SQL QUERIES'
}

export function Sidebar({ activeView, isOpen, onToggle, children }: SidebarProps) {
  if (!isOpen) return null

  return (
    <div className="ide-sidebar w-60 flex flex-col border-r border-[var(--ide-border-default)]">
      {/* Sidebar Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--ide-border-default)]">
        <h2 className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
          {viewTitles[activeView]}
        </h2>
        <button
          onClick={onToggle}
          className="text-[var(--ide-text-muted)] hover:text-[var(--ide-text-primary)] transition-colors"
          title="Close Sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {children}
      </div>
    </div>
  )
}
