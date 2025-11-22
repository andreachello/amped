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

    // Invalidate all queries to refresh data with new contract
    setTimeout(() => {
      queryClient.invalidateQueries()
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
      <main className="w-full flex flex-col gap-y-6 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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
      </main>
    </div>
  );
}
