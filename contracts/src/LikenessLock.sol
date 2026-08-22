// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {WebAuthn} from "@openzeppelin/contracts/utils/cryptography/WebAuthn.sol";
import {P256} from "@openzeppelin/contracts/utils/cryptography/P256.sol";
import {ILikenessLock} from "./ILikenessLock.sol";

/// @title LikenessLock
/// @notice Content-bound, passkey-authorized likeness consent, verified on Monad.
/// @dev Implements spec v1.0 §5 exactly. No NFTs/tokens/upgradeability/ownership frameworks.
contract LikenessLock is ILikenessLock {
    bytes32 private constant ACTION_GRANT = keccak256("LIKENESSLOCK_GRANT_V1");
    bytes32 private constant ACTION_REVOKE = keccak256("LIKENESSLOCK_REVOKE_V1");

    struct Subject {
        bytes32 qx;
        bytes32 qy;
        bool exists;
    }

    struct Asset {
        bytes32 contentHash;
        bytes32 purposeHash;
        uint64 expiresAt;
        uint32 activeConsentCount;
        bool exists;
        bytes32[] requiredSubjects;
    }

    mapping(bytes32 => Subject) public subjects;
    mapping(bytes32 => Asset) private assets;
    mapping(bytes32 => bytes32) public assetByContentHash;
    mapping(bytes32 => mapping(bytes32 => bool)) public isRequired;
    mapping(bytes32 => mapping(bytes32 => ConsentState)) public consentStates;
    mapping(bytes32 => uint256) public nonces;

    // ---------------------------------------------------------------------
    // Subject registration
    // ---------------------------------------------------------------------

    function registerSubject(bytes32 qx, bytes32 qy) external returns (bytes32 subjectId) {
        require(P256.isValidPublicKey(qx, qy), "INVALID_PUBLIC_KEY");

        subjectId = keccak256(abi.encode(qx, qy));
        require(!subjects[subjectId].exists, "SUBJECT_ALREADY_REGISTERED");

        subjects[subjectId] = Subject({qx: qx, qy: qy, exists: true});

        emit SubjectRegistered(subjectId, qx, qy);
    }

    // ---------------------------------------------------------------------
    // Asset creation
    // ---------------------------------------------------------------------

    function createAsset(
        bytes32 contentHash,
        bytes32 purposeHash,
        uint64 expiresAt,
        bytes32[] calldata requiredSubjects
    ) external returns (bytes32 assetId) {
        require(contentHash != bytes32(0), "ZERO_CONTENT_HASH");
        require(requiredSubjects.length > 0, "EMPTY_REQUIRED_SUBJECTS");
        require(expiresAt > block.timestamp, "EXPIRY_IN_PAST");
        require(assetByContentHash[contentHash] == bytes32(0), "DUPLICATE_CONTENT_HASH");

        assetId = keccak256(abi.encode(contentHash, purposeHash, expiresAt, block.timestamp, msg.sender));

        Asset storage asset = assets[assetId];
        asset.contentHash = contentHash;
        asset.purposeHash = purposeHash;
        asset.expiresAt = expiresAt;
        asset.exists = true;

        for (uint256 i = 0; i < requiredSubjects.length; i++) {
            bytes32 subjectId = requiredSubjects[i];
            require(subjects[subjectId].exists, "UNKNOWN_SUBJECT");
            require(!isRequired[assetId][subjectId], "DUPLICATE_REQUIRED_SUBJECT");
            isRequired[assetId][subjectId] = true;
            asset.requiredSubjects.push(subjectId);
        }

        assetByContentHash[contentHash] = assetId;

        emit AssetCreated(assetId, contentHash, purposeHash, expiresAt);
    }

    // ---------------------------------------------------------------------
    // Grant / revoke
    // ---------------------------------------------------------------------

    function grantConsent(bytes32 assetId, bytes32 subjectId, WebAuthnAuth calldata auth) external {
        Asset storage asset = assets[assetId];
        require(asset.exists, "ASSET_NOT_FOUND");
        require(subjects[subjectId].exists, "SUBJECT_NOT_FOUND");
        require(isRequired[assetId][subjectId], "SUBJECT_NOT_REQUIRED");
        require(consentStates[assetId][subjectId] != ConsentState.Active, "ALREADY_ACTIVE");
        require(block.timestamp <= asset.expiresAt, "ASSET_EXPIRED");

        uint256 nonce = nonces[subjectId];
        _verifyAuth(ACTION_GRANT, assetId, asset, subjectId, nonce, auth);

        consentStates[assetId][subjectId] = ConsentState.Active;
        asset.activeConsentCount += 1;
        nonces[subjectId] = nonce + 1;

        emit ConsentGranted(assetId, subjectId, nonce);
    }

    function revokeConsent(bytes32 assetId, bytes32 subjectId, WebAuthnAuth calldata auth) external {
        Asset storage asset = assets[assetId];
        require(asset.exists, "ASSET_NOT_FOUND");
        require(subjects[subjectId].exists, "SUBJECT_NOT_FOUND");
        require(isRequired[assetId][subjectId], "SUBJECT_NOT_REQUIRED");
        require(consentStates[assetId][subjectId] == ConsentState.Active, "NOT_ACTIVE");

        uint256 nonce = nonces[subjectId];
        _verifyAuth(ACTION_REVOKE, assetId, asset, subjectId, nonce, auth);

        consentStates[assetId][subjectId] = ConsentState.Revoked;
        asset.activeConsentCount -= 1;
        nonces[subjectId] = nonce + 1;

        emit ConsentRevoked(assetId, subjectId, nonce);
    }

    function _verifyAuth(
        bytes32 action,
        bytes32 assetId,
        Asset storage asset,
        bytes32 subjectId,
        uint256 nonce,
        WebAuthnAuth calldata auth
    ) private view {
        bytes32 digest = keccak256(
            abi.encode(
                action,
                block.chainid,
                address(this),
                assetId,
                asset.contentHash,
                asset.purposeHash,
                asset.expiresAt,
                subjectId,
                nonce
            )
        );

        bytes memory challenge = abi.encodePacked(digest);

        Subject storage subject = subjects[subjectId];

        require(
            WebAuthn.verify(
                challenge,
                WebAuthn.WebAuthnAuth({
                    r: auth.r,
                    s: auth.s,
                    challengeIndex: auth.challengeIndex,
                    typeIndex: auth.typeIndex,
                    authenticatorData: auth.authenticatorData,
                    clientDataJSON: auth.clientDataJSON
                }),
                subject.qx,
                subject.qy,
                true // require user verification: biometric/PIN when authenticator supports it
            ),
            "INVALID_WEBAUTHN_AUTH"
        );
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getAssetIdByContentHash(bytes32 contentHash) external view returns (bytes32) {
        return assetByContentHash[contentHash];
    }

    function getAssetStatus(bytes32 assetId)
        external
        view
        returns (uint256 active, uint256 required, bool valid, bool expired)
    {
        Asset storage asset = assets[assetId];
        active = asset.activeConsentCount;
        required = asset.requiredSubjects.length;
        expired = asset.exists && block.timestamp > asset.expiresAt;
        valid = asset.exists && !expired && active == required && required > 0;
    }

    function getConsentState(bytes32 assetId, bytes32 subjectId) external view returns (ConsentState) {
        return consentStates[assetId][subjectId];
    }

    function getRequiredSubjects(bytes32 assetId) external view returns (bytes32[] memory) {
        return assets[assetId].requiredSubjects;
    }
}
