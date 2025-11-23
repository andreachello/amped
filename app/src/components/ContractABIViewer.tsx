import type { Abi } from 'viem'
import { categorizeAbi } from '../lib/abiHelpers'
import { useState } from 'react'

interface Props {
  contractAbi?: Abi
  contractAddress?: string
}

export function ContractABIViewer({ contractAbi, contractAddress }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('read')

  if (!contractAbi || !contractAddress) {
    return (
      <div className="h-full flex flex-col bg-[var(--ide-sidebar-bg)]">
        <div className="px-3 py-2 border-b border-[var(--ide-border-default)]">
          <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
            CONTRACT INTERFACE
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="p-3 text-xs text-[var(--ide-text-muted)] italic text-center">
            Deploy a contract to view its ABI
          </div>
        </div>
      </div>
    )
  }

  let readFunctions: any[] = []
  let writeFunctions: any[] = []
  let events: any[] = []

  try {
    const categorized = categorizeAbi(contractAbi)
    readFunctions = categorized.readFunctions || []
    writeFunctions = categorized.writeFunctions || []
    events = categorized.events || []
  } catch (error) {
    console.error('Error categorizing ABI:', error)
    return (
      <div className="h-full flex flex-col bg-[var(--ide-sidebar-bg)]">
        <div className="px-3 py-2 border-b border-[var(--ide-border-default)]">
          <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
            CONTRACT INTERFACE
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="p-3 text-xs text-red-400 text-center">
            Error loading ABI
          </div>
        </div>
      </div>
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const SectionHeader = ({ id, title, count }: { id: string, title: string, count: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--ide-hover-bg)] transition-colors"
    >
      <div className="flex items-center gap-2">
        <svg
          className={`w-3 h-3 text-[var(--ide-text-muted)] transition-transform ${expandedSection === id ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs font-semibold text-[var(--ide-text-primary)]">{title}</span>
      </div>
      <span className="text-xs text-[var(--ide-text-muted)]">{count}</span>
    </button>
  )

  const FunctionItem = ({ name, inputs }: { name: string, inputs?: any[] }) => (
    <div className="px-3 py-1.5 text-xs">
      <div className="font-mono text-[var(--ide-text-primary)]">{name}</div>
      {inputs && inputs.length > 0 && (
        <div className="mt-1 ml-2 space-y-0.5">
          {inputs.map((input, idx) => (
            <div key={idx} className="text-[10px] text-[var(--ide-text-muted)] font-mono">
              {input.name || `arg${idx}`}: <span className="text-[var(--ide-accent-primary)]">{input.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-[var(--ide-sidebar-bg)]">
      <div className="px-3 py-2 border-b border-[var(--ide-border-default)]">
        <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
          CONTRACT INTERFACE
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Read Functions */}
        <div className="border-b border-[var(--ide-border-default)]">
          <SectionHeader id="read" title="Read Functions" count={readFunctions.length} />
          {expandedSection === 'read' && (
            <div className="py-1">
              {readFunctions.map((func: any) => (
                <FunctionItem key={func.name} name={func.name} inputs={func.inputs} />
              ))}
            </div>
          )}
        </div>

        {/* Write Functions */}
        <div className="border-b border-[var(--ide-border-default)]">
          <SectionHeader id="write" title="Write Functions" count={writeFunctions.length} />
          {expandedSection === 'write' && (
            <div className="py-1">
              {writeFunctions.map((func: any) => (
                <FunctionItem key={func.name} name={func.name} inputs={func.inputs} />
              ))}
            </div>
          )}
        </div>

        {/* Events */}
        <div className="border-b border-[var(--ide-border-default)]">
          <SectionHeader id="events" title="Events" count={events.length} />
          {expandedSection === 'events' && (
            <div className="py-1">
              {events.map((event: any) => (
                <FunctionItem key={event.name} name={event.name} inputs={event.inputs} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-[var(--ide-border-default)]">
        <div className="text-[10px] text-[var(--ide-text-muted)] space-y-1">
          <div className="font-mono break-all">
            {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
          </div>
        </div>
      </div>
    </div>
  )
}
