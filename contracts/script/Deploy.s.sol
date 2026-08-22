// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LikenessLock} from "../src/LikenessLock.sol";

contract Deploy is Script {
    function run() external returns (LikenessLock ll) {
        uint256 deployerPk = vm.envUint("RELAYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPk);
        ll = new LikenessLock();
        vm.stopBroadcast();

        console.log("LikenessLock deployed at:", address(ll));
    }
}
