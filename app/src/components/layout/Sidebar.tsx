import { ReactNode } from 'react'
import type { ActivityView } from './ActivityBar'

interface SidebarProps {
  activeView: ActivityView
  isOpen: boolean
  onToggle: () => void
  children?: ReactNode
}

const viewTitles: Record<ActivityView, string> = {
  deployments: 'DEPLOYMENT HISTORY',
  contract: 'CONTRACT INTERFACE',
  sql: 'SQL QUERIES'
}

export function Sidebar({ activeView, isOpen, onToggle, children }: SidebarProps) {
  if (!isOpen) return null

  return (
    <div className="ide-sidebar w-60 flex flex-col border-r border-[var(--ide-border-default)] min-h-0">
      {/* Sidebar Content */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}
