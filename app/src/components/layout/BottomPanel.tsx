import { ReactNode } from 'react'

export interface BottomPanelTab {
  id: string
  title: string
  content: ReactNode
  badge?: number
}

interface BottomPanelProps {
  tabs: BottomPanelTab[]
  activeTabId: string
  onTabChange: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function BottomPanel({ tabs, activeTabId, onTabChange, isOpen, onToggle }: BottomPanelProps) {
  if (!isOpen) return null

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  return (
    <div className="ide-panel border-t border-[var(--ide-border-default)] flex flex-col">
      {/* Panel Header with Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--ide-border-default)] bg-[var(--ide-tab-border)]">
        <div className="flex items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`ide-tab ${tab.id === activeTabId ? 'ide-tab-active' : ''} flex items-center space-x-2`}
            >
              <span>{tab.title}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-[var(--ide-accent-primary)] text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center px-2">
          <button
            onClick={onToggle}
            className="text-[var(--ide-text-muted)] hover:text-[var(--ide-text-primary)] p-1 transition-colors"
            title="Close Panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto">
        {activeTab?.content}
      </div>
    </div>
  )
}
