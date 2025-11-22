"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { privateKeyToAccount } from "viem/accounts";
import { useWriteContract } from "wagmi";
import type { Abi, Address } from "viem";
import { abi as defaultAbi } from "../lib/abi.ts";
import { wagmiConfig } from "../lib/config.ts";
import { address as defaultContractAddress } from "../lib/viem.ts";
import { DecrementTable } from "./DecrementTable.tsx";
import { IncrementTable } from "./IncrementTable.tsx";
import { LogsTable } from "./LogsTable.tsx";
import { TransactionsTable } from "./TransactionsTable.tsx";
import { ContractEditor } from "./ContractEditor.tsx";
import { DeployButton } from "./DeployButton.tsx";
import { DeploymentStatus } from "./DeploymentStatus.tsx";

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

  const handleDeployStart = () => {
    setDeploymentStatus('deploying')
    setDeploymentError('')
  }

  const handleDeploySuccess = (result: any) => {
    setDeploymentStatus('success')
    setDeploymentResult(result)

    // Update contract address and ABI dynamically
    if (result.address) {
      setContractAddress(result.address as Address)
    }
    if (result.abi) {
      setContractAbi(result.abi as Abi)
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

  return (
    <div className="min-h-full">
      <div className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex shrink-0 items-center">Amp Demo - Contract Editor</div>
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
        {/* Contract Editor Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Edit & Deploy Contract</h2>
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

        {/* Contract Interaction Section */}
        <section className="space-y-4 pt-6 border-t">
          <h2 className="text-xl font-semibold">Interact with Contract</h2>
          <p className="w-full text-sm">
            Increment and decrement the counter using the buttons. See the anvil
            transactions and logs queried using Amp!
          </p>
          <div className="flex items-center gap-x-2">
            <IncrementCTA contractAddress={contractAddress} contractAbi={contractAbi} />
            <DecrementCTA contractAddress={contractAddress} contractAbi={contractAbi} />
          </div>
          <div className="w-full grid grid-cols-2 gap-x-2">
            <IncrementTable contractAddress={contractAddress} />
            <DecrementTable contractAddress={contractAddress} />
          </div>
        </section>

        {/* Logs Section */}
        <section className="space-y-4">
          <LogsTable />
          <TransactionsTable />
        </section>
      </main>
    </div>
  );
}

interface CTAProps {
  contractAddress: Address
  contractAbi: Abi
}

function IncrementCTA({ contractAddress, contractAbi }: CTAProps) {
  const queryClient = useQueryClient();
  const { writeContract, status } = useWriteContract({
    config: wagmiConfig,
  });

  return (
    <button
      type="button"
      className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 cursor-pointer  disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
      disabled={status === "pending"}
      onClick={() =>
        writeContract(
          {
            abi: contractAbi,
            address: contractAddress,
            functionName: "increment",
            account,
          },
          {
            onSuccess() {
              // clear the increment query key on event to refresh the data
              setTimeout(() => {
                void queryClient.refetchQueries({
                  queryKey: ["Amp", "Demo", { table: "increments" }] as const,
                });
              }, 1_000);
            },
          }
        )
      }
    >
      Increment
    </button>
  );
}

function DecrementCTA({ contractAddress, contractAbi }: CTAProps) {
  const queryClient = useQueryClient();
  const { writeContract, status } = useWriteContract({
    config: wagmiConfig,
  });

  return (
    <button
      type="button"
      className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-xs hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:shadow-none dark:hover:bg-indigo-500/30 cursor-pointer disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
      disabled={status === "pending"}
      onClick={() =>
        writeContract(
          {
            abi: contractAbi,
            address: contractAddress,
            functionName: "decrement",
            account,
          },
          {
            onSuccess() {
              // clear the increment query key on event to refresh the data
              setTimeout(() => {
                void queryClient.refetchQueries({
                  queryKey: ["Amp", "Demo", { table: "decrements" }] as const,
                });
              }, 1_000);
            },
          }
        )
      }
    >
      Decrement
    </button>
  );
}
