// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev Frozen external interface — see spec §5.4. Do not change field names/order.
interface ILikenessLock {
    struct WebAuthnAuth {
        bytes32 r;
        bytes32 s;
        uint256 challengeIndex;
        uint256 typeIndex;
        bytes authenticatorData;
        string clientDataJSON;
    }

    enum ConsentState {
        None,
        Active,
        Revoked
    }

    event SubjectRegistered(bytes32 indexed subjectId, bytes32 qx, bytes32 qy);
    event AssetCreated(
        bytes32 indexed assetId, bytes32 indexed contentHash, bytes32 purposeHash, uint64 expiresAt
    );
    event ConsentGranted(bytes32 indexed assetId, bytes32 indexed subjectId, uint256 nonceUsed);
    event ConsentRevoked(bytes32 indexed assetId, bytes32 indexed subjectId, uint256 nonceUsed);

    function registerSubject(bytes32 qx, bytes32 qy) external returns (bytes32 subjectId);

    function createAsset(
        bytes32 contentHash,
        bytes32 purposeHash,
        uint64 expiresAt,
        bytes32[] calldata requiredSubjects
    ) external returns (bytes32 assetId);

    function grantConsent(bytes32 assetId, bytes32 subjectId, WebAuthnAuth calldata auth) external;

    function revokeConsent(bytes32 assetId, bytes32 subjectId, WebAuthnAuth calldata auth) external;

    function getAssetIdByContentHash(bytes32 contentHash) external view returns (bytes32 assetId);

    function getAssetStatus(bytes32 assetId)
        external
        view
        returns (uint256 active, uint256 required, bool valid, bool expired);

    function getConsentState(bytes32 assetId, bytes32 subjectId) external view returns (ConsentState);

    function getRequiredSubjects(bytes32 assetId) external view returns (bytes32[] memory);
}
