import { ReactNode, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ActivityBar, ActivityView } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import type { Address } from 'viem'

interface IDELayoutProps {
  walletAddress: Address
  contractAddress?: Address
  contractName?: string
  sidebarContent?: ReactNode
  editorContent: ReactNode
  inspectorContent?: ReactNode
  bottomContent?: ReactNode
  onViewChange?: (view: ActivityView) => void
}

export function IDELayout({
  walletAddress,
  contractAddress,
  contractName,
  sidebarContent,
  editorContent,
  inspectorContent,
  bottomContent,
  onViewChange
}: IDELayoutProps) {
  const [activeView, setActiveView] = useState<ActivityView>('explorer')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isInspectorOpen, setIsInspectorOpen] = useState(true)
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true)

  const handleViewChange = (view: ActivityView) => {
    setActiveView(view)
    setIsSidebarOpen(true)
    onViewChange?.(view)
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--ide-editor-bg)] text-[var(--ide-text-primary)] dark">
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar activeView={activeView} onViewChange={handleViewChange} />

        {/* Resizable Panels */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Left Sidebar */}
          {isSidebarOpen && (
            <>
              <Panel defaultSize={15} minSize={10} maxSize={15}>
                <Sidebar
                  activeView={activeView}
                  isOpen={isSidebarOpen}
                  onToggle={() => setIsSidebarOpen(false)}
                >
                  {sidebarContent}
                </Sidebar>
              </Panel>
              <PanelResizeHandle className="w-0.5 bg-[var(--ide-border-default)] hover:bg-[var(--ide-accent-primary)] transition-colors" />
            </>
          )}

          {/* Center + Right Panel */}
          <Panel defaultSize={isSidebarOpen ? 85 : 100}>
            <PanelGroup direction="vertical" className="h-full">
              {/* Top: Editor + Inspector */}
              <Panel defaultSize={isBottomPanelOpen ? 70 : 100}>
                <PanelGroup direction="horizontal" className="h-full">
                  {/* Editor */}
                  <Panel defaultSize={isInspectorOpen ? 75 : 100}>
                    {editorContent}
                  </Panel>

                  {/* Inspector */}
                  {isInspectorOpen && inspectorContent && (
                    <>
                      <PanelResizeHandle className="w-0.5 bg-[var(--ide-border-default)] hover:bg-[var(--ide-accent-primary)] transition-colors" />
                      <Panel defaultSize={25} minSize={15} maxSize={40}>
                        {inspectorContent}
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>

              {/* Bottom Panel */}
              {isBottomPanelOpen && bottomContent && (
                <>
                  <PanelResizeHandle className="h-0.5 bg-[var(--ide-border-default)] hover:bg-[var(--ide-accent-primary)] transition-colors" />
                  <Panel defaultSize={30} minSize={15} maxSize={60}>
                    {bottomContent}
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar
        contractAddress={contractAddress}
        contractName={contractName}
        network="Anvil (Local)"
        walletAddress={walletAddress}
        isConnected={true}
      />
    </div>
  )
}
