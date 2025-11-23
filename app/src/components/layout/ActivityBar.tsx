import { ReactNode } from 'react'

export type ActivityView = 'deployments' | 'contract' | 'sql'

interface ActivityItem {
  id: ActivityView
  icon: ReactNode
  label: string
}

interface ActivityBarProps {
  activeView: ActivityView
  onViewChange: (view: ActivityView) => void
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const activities: ActivityItem[] = [
    {
      id: 'deployments',
      label: 'Deployments',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'contract',
      label: 'Contract ABI',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'sql',
      label: 'Saved Queries',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M8 11h8M10 15h4" />
        </svg>
      )
    }
  ]

  return (
    <div className="ide-activity-bar w-12 flex flex-col items-center py-2 border-r border-[var(--ide-border-default)]">
      {activities.map((activity) => (
        <button
          key={activity.id}
          onClick={() => onViewChange(activity.id)}
          className={`
            w-12 h-12 flex items-center justify-center
            transition-colors duration-150 relative
            ${activeView === activity.id ? 'text-[var(--ide-text-primary)]' : 'text-[var(--ide-text-muted)] hover:text-[var(--ide-text-primary)]'}
          `}
          title={activity.label}
        >
          {activity.icon}
          {activeView === activity.id && (
            <div className="absolute left-0 w-0.5 h-8 bg-[var(--ide-accent-primary)]" />
          )}
        </button>
      ))}
    </div>
  )
}
