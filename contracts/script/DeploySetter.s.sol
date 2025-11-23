// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {Script} from "./utils/Script.sol";
import {Setter} from "../src/Setter.sol";

contract DeploySetter is Script {
    function run() public {
        vm.startBroadcast();

        bytes memory code = abi.encodePacked(type(Setter).creationCode);
        // Use timestamp-based salt for unique addresses on each deployment
        address deployed = deploy(keccak256(abi.encodePacked("Setter", block.timestamp)), code);

        console.log("Setter deployed to:", deployed);

        vm.stopBroadcast();
    }
}
