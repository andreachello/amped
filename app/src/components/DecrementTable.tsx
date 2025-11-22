"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { performAmpQuery, EVENTS_DATASET } from "../lib/runtime.ts";

type Decrement = {
  block_num: string;
  timestamp: number;
  count: string;
};

interface DecrementTableProps {
  contractAddress?: Address;
}

const ITEMS_PER_PAGE = 10;

export function DecrementTable({ contractAddress }: DecrementTableProps) {
  const [page, setPage] = useState(0);

  const { data } = useQuery({
    queryKey: ["Amp", "Demo", { table: "decrements", address: contractAddress, page }] as const,
    async queryFn() {
      /**
       * This query hits your deployed dataset from running `pnpm amp dev`.
       * **Notice** the FROM clause structure:
       * - `eth_global` -> namespace. `_` is the default. if you set the namespace in the amp.config.ts, then use that namespace here
       * - `counter` -> name; set in the amp.config.ts
       * - `dev` -> revision. `dev` is the default. if when you run the register and deploy commands, if you set the tag, (0.0.1 for example); use that value
       * - `decremented` -> the table named derived from your contract abis
       * => the end result: "eth_global/conter@dev".decremented queries the decremented table on your dataset
       */
      // Note: For local Anvil, we query all events. The address filtering can be added
      // when the Amp dataset schema includes the contract address column.
      const offset = page * ITEMS_PER_PAGE;
      return await performAmpQuery<Decrement>(
        `SELECT block_num, timestamp, count FROM "${EVENTS_DATASET}".decremented ORDER BY block_num DESC LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`
      );
    },
  });

  const hasData = data && data.length > 0;
  const hasNextPage = data && data.length === ITEMS_PER_PAGE;
  const hasPrevPage = page > 0;

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Decrement Transactions
          </h1>
        </div>
      </div>
      <div className="mt-3 flow-root">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <table className="relative min-w-full divide-y divide-gray-300 dark:divide-white/15">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                  >
                    Block #
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {(data ?? []).map((decrement, index) => (
                  <tr key={`${decrement.block_num}-${decrement.timestamp}-${index}`}>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                      {decrement.block_num}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {decrement.timestamp}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {decrement.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 px-4 py-3 sm:px-0">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={!hasPrevPage}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasNextPage}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Page <span className="font-medium">{page + 1}</span>
              {hasData && <span> • {data.length} results</span>}
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={!hasPrevPage}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNextPage}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
