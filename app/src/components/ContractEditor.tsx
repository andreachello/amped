import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'

const DEFAULT_CONTRACT = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

contract Counter {
    event Incremented(uint256 count);
    event Decremented(uint256 count);
    event Returned(uint256 count);

    uint256 public count;

    constructor() {
        count = 0;
    }

    function retFunc() public returns(uint) {
        emit Returned(count);
        return count;
    }

    function increment() public {
        count++;
        emit Incremented(count);
    }

    function decrement() public {
        require(count > 0, "Counter: count is zero");
        count--;
        emit Decremented(count);
    }
}`

interface ContractEditorProps {
  onCodeChange: (code: string) => void
  initialCode?: string
}

export function ContractEditor({ onCodeChange, initialCode }: ContractEditorProps) {
  const [code, setCode] = useState(initialCode || DEFAULT_CONTRACT)

  // Initialize parent state with default code on mount
  useEffect(() => {
    onCodeChange(code)
  }, [])

  const handleChange = (value: string) => {
    setCode(value)
    onCodeChange(value)
  }

  return (
    <div className="w-full border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm font-mono">
        contracts/src/Counter.sol
      </div>
      <CodeMirror
        value={code}
        height="400px"
        theme="dark"
        extensions={[javascript({ jsx: false })]}
        onChange={handleChange}
        className="text-sm"
      />
    </div>
  )
}
