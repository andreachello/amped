import { ReactNode } from 'react'

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}

export function Section({ title, description, children, action }: SectionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
        active
          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

interface PrimaryButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: ReactNode
}

export function PrimaryButton({ onClick, disabled, loading, children }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}

interface SecondaryButtonProps {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

export function SecondaryButton({ onClick, disabled, children }: SecondaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}
