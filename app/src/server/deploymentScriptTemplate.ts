/**
 * Generates a Solidity deployment script for any contract
 */
export function generateDeploymentScript(contractName: string): string {
  return `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {Script} from "./utils/Script.sol";
import {${contractName}} from "../src/${contractName}.sol";

contract Deploy${contractName} is Script {
    function run() public {
        vm.startBroadcast();

        bytes memory code = abi.encodePacked(type(${contractName}).creationCode);
        // Use timestamp-based salt for unique addresses on each deployment
        address deployed = deploy(keccak256(abi.encodePacked("${contractName}", block.timestamp)), code);

        console.log("${contractName} deployed to:", deployed);

        vm.stopBroadcast();
    }
}
`;
}
