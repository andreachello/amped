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
  const [activeMainTab, setActiveMainTab] = useState<'contract' | 'sql'>('contract')

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
          <nav className="-mb-px flex space-x-8" aria-label="Main Tabs">
            <button
              onClick={() => setActiveMainTab('contract')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${
                activeMainTab === 'contract'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Edit & Deploy Contract
            </button>
            <button
              onClick={() => setActiveMainTab('sql')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${
                activeMainTab === 'sql'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              SQL Query Interface
            </button>
          </nav>
        </div>
      </div>

      <main className="w-full flex flex-col gap-y-6 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {activeMainTab === 'contract' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Editor and Deploy */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contract Editor Section */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit & Deploy Contract</h2>
                <ContractEditor onCodeChange={setCode} />
                <div className="flex items-center gap-4">
                  <DeployButton
                    code={code}
                    onDeployStart={handleDeployStart}
                    onDeploySuccess={handleDeploySuccess}
                    onDeployError={handleDeployError}
                  />
                </div>
                <DeploymentStatus
                  status={deploymentStatus}
                  address={deploymentResult?.address}
                  transactionHash={deploymentResult?.transactionHash}
                  error={deploymentError}
                />
              </section>

              {/* View Functions Section */}
              {contractAddress && (
                <section className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <ViewFunctionDisplay
                    contractAddress={contractAddress}
                    contractAbi={contractAbi}
                  />
                </section>
              )}

              {/* Contract Interaction Section */}
              {contractAddress && (
                <section className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Write Functions</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Execute state-changing functions on the contract. All transactions are recorded and queryable via Amp.
                  </p>
                  <DynamicFunctionButtons
                    contractAddress={contractAddress}
                    contractAbi={contractAbi}
                  />
                </section>
              )}

              {/* Function Transactions Section */}
              {contractAddress && (
                <section className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Function Transactions</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View transaction history for each function, indexed and queryable via Amp.
                  </p>
                  <DynamicFunctionTables
                    contractAddress={contractAddress}
                    contractAbi={contractAbi}
                    functionEventMapping={functionEventMapping}
                  />
                </section>
              )}

              {/* Logs and Transactions Section */}
              <section className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Logs & Transactions</h2>
                <LogsAndTransactionsTabs />
              </section>
            </div>

            {/* Right Column - Deployment History */}
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

        {activeMainTab === 'sql' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">SQL Query Interface</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Write custom SQL queries to explore event logs and transaction data from your deployed contracts.
                </p>
              </div>
            </div>
            <SQLQueryInterface contractAddress={contractAddress} />
          </div>
        )}
      </main>
    </div>
  );
}
