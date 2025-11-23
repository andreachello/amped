import { ReactNode } from 'react'

export interface EditorTab {
  id: string
  title: string
  content: ReactNode
  closable?: boolean
}

interface EditorPanelProps {
  tabs: EditorTab[]
  activeTabId: string
  onTabChange: (id: string) => void
}

export function EditorPanel({ tabs, activeTabId, onTabChange }: EditorPanelProps) {
  const activeTab = tabs.find(tab => tab.id === activeTabId)

  return (
    <div className="flex flex-col h-full ide-editor">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-[var(--ide-border-default)] bg-[var(--ide-tab-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`ide-tab ${tab.id === activeTabId ? 'ide-tab-active' : ''}`}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab?.content}
      </div>
    </div>
  )
}
