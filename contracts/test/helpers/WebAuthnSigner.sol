// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Vm} from "forge-std/Vm.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {P256} from "@openzeppelin/contracts/utils/cryptography/P256.sol";
import {ILikenessLock} from "../../src/ILikenessLock.sol";

/// @dev Builds real WebAuthn assertions in tests using Foundry's P256 cheatcodes,
/// mirroring what Ox WebAuthnP256 + the browser authenticator produce in production.
library WebAuthnSigner {
    bytes1 internal constant FLAGS_UP_UV = 0x05; // UP | UV

    function auth(Vm vm, uint256 privateKey, bytes32 digest)
        internal
        pure
        returns (ILikenessLock.WebAuthnAuth memory result)
    {
        bytes memory challenge = abi.encodePacked(digest);

        bytes memory authenticatorData = abi.encodePacked(bytes32(0), FLAGS_UP_UV, bytes4(0));
        string memory clientDataJSON =
            string.concat('{"type":"webauthn.get","challenge":"', Base64.encodeURL(challenge), '"}');

        bytes32 messageHash = sha256(abi.encodePacked(authenticatorData, sha256(bytes(clientDataJSON))));
        (bytes32 r, bytes32 s) = vm.signP256(privateKey, messageHash);
        // P256.verify handles malleability, but normalize like a real client would.
        uint256 sVal = uint256(s);
        if (sVal > P256.N / 2) {
            s = bytes32(P256.N - sVal);
        }

        result = ILikenessLock.WebAuthnAuth({
            r: r,
            s: s,
            challengeIndex: 23,
            typeIndex: 1,
            authenticatorData: authenticatorData,
            clientDataJSON: clientDataJSON
        });
    }

    function pubKey(Vm vm, uint256 privateKey) internal pure returns (bytes32 qx, bytes32 qy) {
        (uint256 x, uint256 y) = vm.publicKeyP256(privateKey);
        qx = bytes32(x);
        qy = bytes32(y);
    }
}
