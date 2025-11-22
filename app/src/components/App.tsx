"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Abi, Address } from "viem";
import { abi as defaultAbi } from "../lib/abi.ts";
import { address as defaultContractAddress } from "../lib/viem.ts";
import { ContractEditor } from "./ContractEditor.tsx";
import { DeployButton } from "./DeployButton.tsx";
import { DeploymentStatus } from "./DeploymentStatus.tsx";
import { DynamicFunctionButtons } from "./DynamicFunctionButtons.tsx";
import { ViewFunctionDisplay } from "./ViewFunctionDisplay.tsx";
import { DynamicFunctionTables } from "./DynamicFunctionTables.tsx";
import { DeploymentSelector } from "./DeploymentSelector.tsx";
import { LogsAndTransactionsTabs } from "./LogsAndTransactionsTabs.tsx";
import { SQLQueryInterface } from "./SQLQueryInterface.tsx";
import { Section, TabButton, PrimaryButton } from "./UnifiedLayout.tsx";
import {
  addDeployment,
  loadDeployments,
  type DeploymentRecord,
} from "../lib/deploymentHistory.ts";
import { getContractFunctionEventMapping, type FunctionEventMapping } from "../lib/contractParser.ts";
import { categorizeAbi } from "../lib/abiHelpers.ts";
import { privateKeyToAccount } from "viem/accounts";

/**
 * This is one of the private keys created by anvil and is available to perform transactions for.
 * Any of the private keys can be used.
 */
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

  // Top-level tab state
  const [activeMainTab, setActiveMainTab] = useState<'edit' | 'interact' | 'sql'>('edit')

  // Load deployment history on mount
  useEffect(() => {
    const deployments = loadDeployments()
    if (deployments.length > 0) {
      // Use the most recent deployment as active
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

    // Save to deployment history
    if (result.address && result.abi) {
      // Parse contract to get function-event mappings
      const { writeFunctions, events } = categorizeAbi(result.abi as Abi)
      const functionNames = writeFunctions.map(f => f.name)
      const eventNames = events.map((e: any) => e.name)

      const mapping = getContractFunctionEventMapping(
        code, // Current contract source code
        functionNames,
        eventNames
      )

      const deployment = addDeployment(
        result.address as Address,
        result.abi as Abi,
        result.transactionHash || '',
        `Contract ${new Date().toLocaleTimeString()}`,
        code, // Store source code
        mapping // Store function-event mapping
      )
      setActiveDeploymentId(deployment.id)
      setContractAddress(deployment.address)
      setContractAbi(deployment.abi)
      setFunctionEventMapping(mapping)
    }

    // Only invalidate view functions (read-only state)
    // Don't invalidate event queries - they'll load on demand when tabs are clicked
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

    // Refresh queries with the selected deployment
    setTimeout(() => {
      queryClient.invalidateQueries()
    }, 100)
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex shrink-0 items-center">Amp Demo - Dynamic Contract Editor</div>
            </div>
            <div className="w-fit flex items-center">
              {`${address.substring(0, 6)}...${address.substring(
                address.length - 6,
                address.length
              )}`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-2" aria-label="Main Tabs">
            <TabButton active={activeMainTab === 'edit'} onClick={() => setActiveMainTab('edit')}>
              Edit & Deploy
            </TabButton>
            <TabButton active={activeMainTab === 'interact'} onClick={() => setActiveMainTab('interact')}>
              Contract Interface
            </TabButton>
            <TabButton active={activeMainTab === 'sql'} onClick={() => setActiveMainTab('sql')}>
              SQL Query
            </TabButton>
          </nav>
        </div>
      </div>

      <main className="w-full flex flex-col gap-y-6 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Edit & Deploy Tab */}
        {activeMainTab === 'edit' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Section
                title="Contract Editor"
                description="Edit your Solidity contract code and deploy to the local Anvil blockchain"
              >
                <div className="space-y-4">
                  <ContractEditor onCodeChange={setCode} />
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
              </Section>
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <DeploymentSelector
                  activeDeploymentId={activeDeploymentId}
                  onSelectDeployment={handleSelectDeployment}
                />
              </div>
            </div>
          </div>
        )}

        {/* Contract Interface Tab */}
        {activeMainTab === 'interact' && (
          <div className="space-y-6">
            {contractAddress ? (
              <>
                <Section
                  title="View Functions"
                  description="Read-only functions that query the current state of the contract"
                >
                  <ViewFunctionDisplay
                    contractAddress={contractAddress}
                    contractAbi={contractAbi}
                  />
                </Section>

                <Section
                  title="Write Functions"
                  description="Execute state-changing functions on the contract. All transactions are recorded and queryable via Amp."
                >
                  <DynamicFunctionButtons
                    contractAddress={contractAddress}
                    contractAbi={contractAbi}
                  />
                </Section>

                <Section
                  title="Function Transactions"
                  description="View transaction history for each function, indexed and queryable via Amp"
                >
                  <DynamicFunctionTables
                    contractAddress={contractAddress}
                    contractAbi={contractAbi}
                    functionEventMapping={functionEventMapping}
                  />
                </Section>

                <Section
                  title="All Logs & Transactions"
                  description="View all event logs and transactions across the blockchain"
                >
                  <LogsAndTransactionsTabs />
                </Section>
              </>
            ) : (
              <Section
                title="Contract Interface"
                description="View functions, write functions, and event transactions"
              >
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Deploy a contract first to interact with it
                </div>
              </Section>
            )}
          </div>
        )}

        {/* SQL Query Tab */}
        {activeMainTab === 'sql' && (
          <Section
            title="SQL Query Interface"
            description="Write custom SQL queries to explore event logs and transaction data from your deployed contracts"
          >
            <SQLQueryInterface contractAddress={contractAddress} />
          </Section>
        )}
      </main>
    </div>
  );
}
