// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {Script} from "./utils/Script.sol";
import {Counkter} from "../src/Counkter.sol";

contract DeployCounkter is Script {
    function run() public {
        vm.startBroadcast();

        bytes memory code = abi.encodePacked(type(Counkter).creationCode);
        // Use timestamp-based salt for unique addresses on each deployment
        address deployed = deploy(keccak256(abi.encodePacked("Counkter", block.timestamp)), code);

        console.log("Counkter deployed to:", deployed);

        vm.stopBroadcast();
    }
}
