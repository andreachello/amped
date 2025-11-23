"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Abi, Address } from "viem";
import { abi as defaultAbi } from "../lib/abi.ts";
import { address as defaultContractAddress } from "../lib/viem.ts";
import { ContractEditor } from "./ContractEditor.tsx";
import { DeployButton } from "./DeployButton.tsx";
import { DeploymentStatus } from "./DeploymentStatus.tsx";
import { ContractFunctions } from "./ContractFunctions.tsx";
import { ViewFunctionDisplay } from "./ViewFunctionDisplay.tsx";
import { DynamicFunctionTables } from "./DynamicFunctionTables.tsx";
import { DeploymentSelector } from "./DeploymentSelector.tsx";
import { LogsAndTransactionsTabs } from "./LogsAndTransactionsTabs.tsx";
import { SQLEditor } from "./SQLEditor.tsx";
import { SQLResults } from "./SQLResults.tsx";
import { GraphsEditor } from "./GraphsEditor.tsx";
import { ExampleGraphQueries } from "./ExampleGraphQueries.tsx";
import {
  addDeployment,
  loadDeployments,
  type DeploymentRecord,
} from "../lib/deploymentHistory.ts";
import { useAllEventData } from "../hooks/useAllEventData.ts";
import { getContractFunctionEventMapping, type FunctionEventMapping } from "../lib/contractParser.ts";
import { categorizeAbi } from "../lib/abiHelpers.ts";
import { privateKeyToAccount } from "viem/accounts";
import { IDELayout } from "./layout/IDELayout.tsx";
import { EditorPanel, type EditorTab } from "./layout/EditorPanel.tsx";
import { InspectorPanel } from "./layout/InspectorPanel.tsx";
import { BottomPanel, type BottomPanelTab } from "./layout/BottomPanel.tsx";
import type { ActivityView } from "./layout/ActivityBar.tsx";

const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const address = account.address;

type DeployStatus = 'idle' | 'deploying' | 'success' | 'error'

export function App() {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState<DeployStatus>('idle')
  const [deploymentResult, setDeploymentResult] = useState<any>(null)
  const [deploymentError, setDeploymentError] = useState<string>('')

  // Dynamic contract state
  const [contractAddress, setContractAddress] = useState<Address>(defaultContractAddress)
  const [contractAbi, setContractAbi] = useState<Abi>(defaultAbi)
  const [functionEventMapping, setFunctionEventMapping] = useState<FunctionEventMapping | undefined>()

  // Deployment history state
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null)

  // IDE Layout state
  const [activeSidebarView, setActiveSidebarView] = useState<ActivityView>('explorer')
  const [activeEditorTab, setActiveEditorTab] = useState('editor')
  const [activeBottomTab, setActiveBottomTab] = useState('events')

  // SQL state
  const [sqlQuery, setSqlQuery] = useState('')
  const [sqlResults, setSqlResults] = useState<any[]>([])
  const [sqlIsLoading, setSqlIsLoading] = useState(false)
  const [sqlError, setSqlError] = useState<string | null>(null)

  // Fetch all event data for graphs
  const { data: eventData } = useAllEventData(contractAddress, contractAbi)

  // Load deployment history on mount
  useEffect(() => {
    const deployments = loadDeployments()
    if (deployments.length > 0) {
      const latest = deployments[deployments.length - 1]
      setActiveDeploymentId(latest.id)
      setContractAddress(latest.address)
      setContractAbi(latest.abi)
      setFunctionEventMapping(latest.functionEventMapping)
    }
  }, [])

  const handleDeployStart = () => {
    setDeploymentStatus('deploying')
    setDeploymentError('')
  }

  const handleDeploySuccess = (result: any) => {
    setDeploymentStatus('success')
    setDeploymentResult(result)

    if (result.address && result.abi) {
      const { writeFunctions, events } = categorizeAbi(result.abi as Abi)
      const functionNames = writeFunctions.map(f => f.name)
      const eventNames = events.map((e: any) => e.name)

      const mapping = getContractFunctionEventMapping(
        code,
        functionNames,
        eventNames
      )

      const deployment = addDeployment(
        result.address as Address,
        result.abi as Abi,
        result.transactionHash || '',
        `Contract ${new Date().toLocaleTimeString()}`,
        code,
        mapping
      )
      setActiveDeploymentId(deployment.id)
      setContractAddress(deployment.address)
      setContractAbi(deployment.abi)
      setFunctionEventMapping(mapping)
    }

    setTimeout(() => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'contract' &&
          query.queryKey[1] === 'read'
      })
    }, 1_000)
  }

  const handleDeployError = (error: string) => {
    setDeploymentStatus('error')
    setDeploymentError(error)
  }

  const handleSelectDeployment = (deployment: DeploymentRecord) => {
    setActiveDeploymentId(deployment.id)
    setContractAddress(deployment.address)
    setContractAbi(deployment.abi)
    setFunctionEventMapping(deployment.functionEventMapping)

    setTimeout(() => {
      queryClient.invalidateQueries()
    }, 100)
  }

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return

    setSqlIsLoading(true)
    setSqlError(null)
    // No need to switch tabs anymore, results is the only tab when on SQL editor

    try {
      const response = await fetch('http://localhost:3001/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sqlQuery }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Query failed')
      }

      setSqlResults(data.results || [])
    } catch (err: any) {
      setSqlError(err.message || 'An error occurred')
      setSqlResults([])
    } finally {
      setSqlIsLoading(false)
    }
  }

  // Handle editor tab changes - switch bottom tab appropriately
  const handleEditorTabChange = (tabId: string) => {
    setActiveEditorTab(tabId)
    if (tabId === 'sql') {
      setActiveBottomTab('results')
    } else if (tabId === 'graphs') {
      setActiveBottomTab('graph-data')
    } else {
      setActiveBottomTab('events')
    }
  }

  // Handle example query selection from inspector
  const handleSelectExampleQuery = (query: string, title: string) => {
    setSqlQuery(query)
    setActiveEditorTab('sql')
    setActiveBottomTab('results')
  }

  // Define editor tabs
  const editorTabs: EditorTab[] = [
    {
      id: 'editor',
      title: 'Contract Editor',
      content: (
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0 p-3">
            <ContractEditor onCodeChange={setCode} />
          </div>
          <div className="flex-shrink-0 border-t border-[var(--ide-border-default)] px-3 py-2 bg-[var(--ide-sidebar-bg)] space-y-1.5">
            <DeployButton
              code={code}
              onDeployStart={handleDeployStart}
              onDeploySuccess={handleDeploySuccess}
              onDeployError={handleDeployError}
            />
            <DeploymentStatus
              status={deploymentStatus}
              address={deploymentResult?.address}
              transactionHash={deploymentResult?.transactionHash}
              error={deploymentError}
            />
          </div>
        </div>
      )
    },
    {
      id: 'sql',
      title: 'SQL Query',
      content: (
        <SQLEditor
          contractAddress={contractAddress}
          query={sqlQuery}
          onQueryChange={setSqlQuery}
          onExecuteQuery={executeQuery}
          isLoading={sqlIsLoading}
        />
      )
    },
    {
      id: 'graphs',
      title: 'Graphs',
      content: (
        <GraphsEditor
          sqlResults={sqlResults}
          eventData={eventData}
        />
      )
    }
  ]

  // Define bottom panel tabs based on active editor tab
  const bottomTabs: BottomPanelTab[] = activeEditorTab === 'sql' ? [
    {
      id: 'results',
      title: 'Query Results',
      content: (
        <div className="h-full p-3">
          <SQLResults
            results={sqlResults}
            isLoading={sqlIsLoading}
            error={sqlError}
          />
        </div>
      )
    }
  ] : activeEditorTab === 'graphs' ? [
    {
      id: 'graph-data',
      title: 'Data Table',
      content: (
        <div className="h-full p-3 overflow-auto">
          {eventData && eventData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="text-xs text-[var(--ide-text-muted)] mb-2">
                All contract events ({eventData.length} records)
              </div>
              <table className="min-w-full divide-y divide-[var(--ide-border-default)]">
                <thead>
                  <tr>
                    {Object.keys(eventData[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)] bg-[var(--ide-sidebar-bg)]">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ide-border-default)]">
                  {eventData.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-[var(--ide-hover-bg)]">
                      {Object.values(row).map((value: any, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 text-xs text-[var(--ide-text-primary)] font-mono">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {eventData.length > 50 && (
                <div className="text-xs text-[var(--ide-text-muted)] mt-2">
                  Showing first 50 of {eventData.length} records
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[var(--ide-text-muted)] italic">
              No event data available. Deploy a contract and call functions to generate events.
            </div>
          )}
        </div>
      )
    }
  ] : [
    {
      id: 'events',
      title: 'Event History',
      content: (
        <div className="h-full p-3">
          {contractAddress ? (
            <DynamicFunctionTables
              contractAddress={contractAddress}
              contractAbi={contractAbi}
              functionEventMapping={functionEventMapping}
            />
          ) : (
            <div className="text-center py-12 text-[var(--ide-text-muted)]">
              Deploy a contract first to view events
            </div>
          )}
        </div>
      )
    },
    {
      id: 'logs',
      title: 'Logs & Transactions',
      content: (
        <div className="h-full p-3">
          <LogsAndTransactionsTabs />
        </div>
      )
    },
    {
      id: 'output',
      title: 'Output',
      content: (
        <div className="h-full p-3">
          <div className="text-[var(--ide-text-muted)] text-sm">
            Deployment output and logs will appear here
          </div>
        </div>
      )
    }
  ]

  // Sidebar content based on active view
  const getSidebarContent = () => {
    switch (activeSidebarView) {
      case 'deployments':
        return (
          <DeploymentSelector
            activeDeploymentId={activeDeploymentId}
            onSelectDeployment={handleSelectDeployment}
          />
        )
      case 'contract':
        return (
          <div className="p-3 text-sm text-[var(--ide-text-muted)]">
            Contract functions and ABI will appear here
          </div>
        )
      case 'sql':
        return (
          <div className="p-3 text-sm text-[var(--ide-text-muted)]">
            Saved SQL queries will appear here
          </div>
        )
      default:
        return (
          <DeploymentSelector
            activeDeploymentId={activeDeploymentId}
            onSelectDeployment={handleSelectDeployment}
          />
        )
    }
  }

  return (
    <IDELayout
      walletAddress={address}
      contractAddress={contractAddress}
      contractName="Counter.sol"
      onViewChange={setActiveSidebarView}
      sidebarContent={getSidebarContent()}
      editorContent={
        <EditorPanel
          tabs={editorTabs}
          activeTabId={activeEditorTab}
          onTabChange={handleEditorTabChange}
        />
      }
      inspectorContent={
        <InspectorPanel isOpen={true} onToggle={() => {}}>
          {activeEditorTab === 'graphs' ? (
            <ExampleGraphQueries
              contractAddress={contractAddress}
              onSelectQuery={handleSelectExampleQuery}
            />
          ) : contractAddress ? (
            <>
              <div className="border-b border-[var(--ide-border-default)] pb-3 mb-3">
                <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] mb-3 tracking-wider">
                  CONTRACT STATE
                </h3>
                <ViewFunctionDisplay
                  contractAddress={contractAddress}
                  contractAbi={contractAbi}
                />
              </div>
              <div className="border-b border-[var(--ide-border-default)] pb-3 mb-3">
                <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] mb-3 tracking-wider">
                  WRITE FUNCTIONS
                </h3>
                <ContractFunctions
                  contractAddress={contractAddress}
                  contractAbi={contractAbi}
                />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
                  DEPLOYMENT INFO
                </h3>
                <div className="text-xs space-y-1.5 bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded-md p-2">
                  <div className="flex flex-col">
                    <span className="text-[var(--ide-text-muted)] mb-1">Address:</span>
                    <span className="text-[var(--ide-text-primary)] font-mono break-all">
                      {contractAddress}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[var(--ide-text-muted)] text-xs">
              Deploy a contract to view functions
            </div>
          )}
        </InspectorPanel>
      }
      bottomContent={
        <BottomPanel
          tabs={bottomTabs}
          activeTabId={activeBottomTab}
          onTabChange={setActiveBottomTab}
          isOpen={true}
          onToggle={() => {}}
        />
      }
    />
  );
}
