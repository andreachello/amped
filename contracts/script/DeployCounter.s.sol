// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {Script} from "./utils/Script.sol";
import {Counter} from "../src/Counter.sol";

contract DeployCounter is Script {
    function run() public {
        vm.startBroadcast();

        bytes memory code = abi.encodePacked(type(Counter).creationCode);
        // Use timestamp-based salt for unique addresses on each deployment
        address counter = deploy(keccak256(abi.encodePacked("Counter", block.timestamp)), code);

        console.log("Counter deployed to:", counter);

        vm.stopBroadcast();
    }
}
