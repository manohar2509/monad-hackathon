// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LikenessLock} from "../src/LikenessLock.sol";
import {ILikenessLock} from "../src/ILikenessLock.sol";
import {WebAuthnSigner} from "./helpers/WebAuthnSigner.sol";

contract LikenessLockTest is Test {
    bytes32 private constant ACTION_GRANT = keccak256("LIKENESSLOCK_GRANT_V1");
    bytes32 private constant ACTION_REVOKE = keccak256("LIKENESSLOCK_REVOKE_V1");

    LikenessLock internal ll;

    uint256 internal alicePk = 0xA11CE;
    uint256 internal bobPk = 0xB0B;
    bytes32 internal aliceQx;
    bytes32 internal aliceQy;
    bytes32 internal bobQx;
    bytes32 internal bobQy;
    bytes32 internal aliceId;
    bytes32 internal bobId;

    function setUp() public {
        ll = new LikenessLock();

        (aliceQx, aliceQy) = WebAuthnSigner.pubKey(vm, alicePk);
        (bobQx, bobQy) = WebAuthnSigner.pubKey(vm, bobPk);

        aliceId = ll.registerSubject(aliceQx, aliceQy);
        bobId = ll.registerSubject(bobQx, bobQy);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    function _digest(bytes32 action, bytes32 assetId, bytes32 subjectId, uint256 nonce)
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                action, block.chainid, address(ll), assetId, _lastContentHash, _lastPurposeHash, _lastExpiresAt, subjectId, nonce
            )
        );
    }

    // Track last-created asset fields so tests can reconstruct the exact digest
    // the contract expects (mirrors what a real client reads from chain state).
    bytes32 internal _lastContentHash;
    bytes32 internal _lastPurposeHash;
    uint64 internal _lastExpiresAt;

    function _createAsset(bytes32[] memory required) internal returns (bytes32 assetId, bytes32 contentHash) {
        contentHash = keccak256(abi.encodePacked("content", block.timestamp, gasleft()));
        bytes32 purposeHash = keccak256("Commercial AI advertisement");
        uint64 expiresAt = uint64(block.timestamp + 7 days);

        assetId = ll.createAsset(contentHash, purposeHash, expiresAt, required);

        _lastContentHash = contentHash;
        _lastPurposeHash = purposeHash;
        _lastExpiresAt = expiresAt;
    }

    function _oneSubject(bytes32 id) internal pure returns (bytes32[] memory arr) {
        arr = new bytes32[](1);
        arr[0] = id;
    }

    function _twoSubjects(bytes32 a, bytes32 b) internal pure returns (bytes32[] memory arr) {
        arr = new bytes32[](2);
        arr[0] = a;
        arr[1] = b;
    }

    // ---------------------------------------------------------------
    // AT-01 Registration
    // ---------------------------------------------------------------

    function test_AT01_RegisterSubject() public view {
        assertEq(aliceId, keccak256(abi.encode(aliceQx, aliceQy)));
        (bytes32 qx, bytes32 qy, bool exists) = ll.subjects(aliceId);
        assertEq(qx, aliceQx);
        assertEq(qy, aliceQy);
        assertTrue(exists);
    }

    function test_RegisterSubject_RejectsDuplicate() public {
        vm.expectRevert(bytes("SUBJECT_ALREADY_REGISTERED"));
        ll.registerSubject(aliceQx, aliceQy);
    }

    // ---------------------------------------------------------------
    // AT-02 Asset creation
    // ---------------------------------------------------------------

    function test_AT02_CreateAsset_And_LookupByContentHash() public {
        (bytes32 assetId, bytes32 contentHash) = _createAsset(_twoSubjects(aliceId, bobId));
        assertEq(ll.getAssetIdByContentHash(contentHash), assetId);

        bytes32[] memory req = ll.getRequiredSubjects(assetId);
        assertEq(req.length, 2);
    }

    function test_CreateAsset_RejectsZeroContentHash() public {
        vm.expectRevert(bytes("ZERO_CONTENT_HASH"));
        ll.createAsset(bytes32(0), keccak256("p"), uint64(block.timestamp + 1 days), _oneSubject(aliceId));
    }

    function test_CreateAsset_RejectsEmptyRequiredSubjects() public {
        vm.expectRevert(bytes("EMPTY_REQUIRED_SUBJECTS"));
        ll.createAsset(keccak256("c"), keccak256("p"), uint64(block.timestamp + 1 days), new bytes32[](0));
    }

    function test_CreateAsset_RejectsUnknownSubject() public {
        bytes32 unknown = keccak256("nobody");
        vm.expectRevert(bytes("UNKNOWN_SUBJECT"));
        ll.createAsset(keccak256("c"), keccak256("p"), uint64(block.timestamp + 1 days), _oneSubject(unknown));
    }

    function test_CreateAsset_RejectsDuplicateRequiredSubject() public {
        vm.expectRevert(bytes("DUPLICATE_REQUIRED_SUBJECT"));
        ll.createAsset(
            keccak256("c"), keccak256("p"), uint64(block.timestamp + 1 days), _twoSubjects(aliceId, aliceId)
        );
    }

    function test_CreateAsset_RejectsPastExpiry() public {
        vm.warp(1_000_000);
        vm.expectRevert(bytes("EXPIRY_IN_PAST"));
        ll.createAsset(keccak256("c"), keccak256("p"), uint64(block.timestamp - 1), _oneSubject(aliceId));
    }

    function test_CreateAsset_RejectsDuplicateContentHash() public {
        (, bytes32 contentHash) = _createAsset(_oneSubject(aliceId));
        vm.expectRevert(bytes("DUPLICATE_CONTENT_HASH"));
        ll.createAsset(contentHash, keccak256("p2"), uint64(block.timestamp + 1 days), _oneSubject(bobId));
    }

    // ---------------------------------------------------------------
    // AT-03 Grant consent (+ malformed challenge fails)
    // ---------------------------------------------------------------

    function test_AT03_GrantConsent_Succeeds() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));

        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        ll.grantConsent(assetId, aliceId, a);

        assertEq(uint256(ll.getConsentState(assetId, aliceId)), uint256(ILikenessLock.ConsentState.Active));
        (uint256 active, uint256 required, bool valid, bool expired) = ll.getAssetStatus(assetId);
        assertEq(active, 1);
        assertEq(required, 1);
        assertTrue(valid);
        assertFalse(expired);
    }

    function test_AT03_GrantConsent_WrongChallengeFails() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));

        // Sign a digest for the wrong action (REVOKE instead of GRANT) -> wrong challenge.
        bytes32 wrongDigest = _digest(ACTION_REVOKE, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, wrongDigest);

        vm.expectRevert(bytes("INVALID_WEBAUTHN_AUTH"));
        ll.grantConsent(assetId, aliceId, a);
    }

    // ---------------------------------------------------------------
    // AT-04 Replay resistance
    // ---------------------------------------------------------------

    function test_AT04_ReplayAfterNonceConsumed_Fails() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));

        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        ll.grantConsent(assetId, aliceId, a);

        // Same signed auth cannot be replayed: state is already Active.
        vm.expectRevert(bytes("ALREADY_ACTIVE"));
        ll.grantConsent(assetId, aliceId, a);
    }

    // ---------------------------------------------------------------
    // AT-05 Status
    // ---------------------------------------------------------------

    function test_AT05_ValidWhenAllRequiredActiveAndNotExpired() public {
        (bytes32 assetId,) = _createAsset(_twoSubjects(aliceId, bobId));

        _grant(assetId, aliceId, alicePk);
        (,, bool validAfterAlice,) = ll.getAssetStatus(assetId);
        assertFalse(validAfterAlice);

        _grant(assetId, bobId, bobPk);
        (,, bool validAfterBob,) = ll.getAssetStatus(assetId);
        assertTrue(validAfterBob);
    }

    // ---------------------------------------------------------------
    // AT-06 Tamper detection
    // ---------------------------------------------------------------

    function test_AT06_TamperedFileDoesNotResolve() public {
        (, bytes32 originalHash) = _createAsset(_oneSubject(aliceId));
        bytes32 editedHash = keccak256("different bytes entirely");
        assertTrue(editedHash != originalHash);
        assertEq(ll.getAssetIdByContentHash(editedHash), bytes32(0));
    }

    // ---------------------------------------------------------------
    // AT-07 Revoke
    // ---------------------------------------------------------------

    function test_AT07_Revoke_MakesInvalid() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        _grant(assetId, aliceId, alicePk);

        (,, bool validBefore,) = ll.getAssetStatus(assetId);
        assertTrue(validBefore);

        bytes32 digest = _digest(ACTION_REVOKE, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);
        ll.revokeConsent(assetId, aliceId, a);

        assertEq(uint256(ll.getConsentState(assetId, aliceId)), uint256(ILikenessLock.ConsentState.Revoked));
        (,, bool validAfter,) = ll.getAssetStatus(assetId);
        assertFalse(validAfter);
    }

    function test_Reauthorize_AfterRevoke_UsesNewNonce() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        _grant(assetId, aliceId, alicePk);
        _revoke(assetId, aliceId, alicePk);

        // Grant again with fresh nonce succeeds.
        _grant(assetId, aliceId, alicePk);
        assertEq(uint256(ll.getConsentState(assetId, aliceId)), uint256(ILikenessLock.ConsentState.Active));
    }

    // ---------------------------------------------------------------
    // AT-08 Wrong subject
    // ---------------------------------------------------------------

    function test_AT08_NonRequiredSubjectCannotGrant() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));

        bytes32 digest = _digest(ACTION_GRANT, assetId, bobId, ll.nonces(bobId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, bobPk, digest);

        vm.expectRevert(bytes("SUBJECT_NOT_REQUIRED"));
        ll.grantConsent(assetId, bobId, a);
    }

    // ---------------------------------------------------------------
    // AT-09 Expiry
    // ---------------------------------------------------------------

    function test_AT09_ExpiredAssetNeverValid() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        _grant(assetId, aliceId, alicePk);

        (,, bool validBefore,) = ll.getAssetStatus(assetId);
        assertTrue(validBefore);

        vm.warp(_lastExpiresAt + 1);

        (,, bool validAfter, bool expired) = ll.getAssetStatus(assetId);
        assertFalse(validAfter);
        assertTrue(expired);
    }

    function test_GrantConsent_RejectsAfterExpiry() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        vm.warp(_lastExpiresAt + 1);

        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        vm.expectRevert(bytes("ASSET_EXPIRED"));
        ll.grantConsent(assetId, aliceId, a);
    }

    // ---------------------------------------------------------------
    // AT-10 Relayer trust: any caller can submit, only valid auth matters
    // ---------------------------------------------------------------

    function test_AT10_AnyCallerMaySubmitValidAuth() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));

        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        address randomCaller = address(0xBEEF);
        vm.prank(randomCaller);
        ll.grantConsent(assetId, aliceId, a);

        assertEq(uint256(ll.getConsentState(assetId, aliceId)), uint256(ILikenessLock.ConsentState.Active));
    }

    function test_AT10_InvalidAuthRevertsRegardlessOfCaller() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));

        // Bob signs, but we submit it as Alice's consent -> wrong public key -> fails.
        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory forged = WebAuthnSigner.auth(vm, bobPk, digest);

        vm.expectRevert(bytes("INVALID_WEBAUTHN_AUTH"));
        ll.grantConsent(assetId, aliceId, forged);
    }

    // ---------------------------------------------------------------
    // 12.1 Minimum negative tests
    // ---------------------------------------------------------------

    function test_Negative_WrongNonceReverts() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        // Sign with nonce+1 (wrong) instead of the current nonce (0).
        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId) + 1);
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        vm.expectRevert(bytes("INVALID_WEBAUTHN_AUTH"));
        ll.grantConsent(assetId, aliceId, a);
    }

    function test_Negative_WrongActionDigestReverts() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        bytes32 wrongAction = keccak256("SOME_OTHER_ACTION");
        bytes32 digest = keccak256(
            abi.encode(
                wrongAction,
                block.chainid,
                address(ll),
                assetId,
                _lastContentHash,
                _lastPurposeHash,
                _lastExpiresAt,
                aliceId,
                ll.nonces(aliceId)
            )
        );
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        vm.expectRevert(bytes("INVALID_WEBAUTHN_AUTH"));
        ll.grantConsent(assetId, aliceId, a);
    }

    function test_Negative_WrongAssetIdReverts() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        (bytes32 otherAssetId,) = _createAsset(_oneSubject(bobId));

        // Sign digest bound to otherAssetId but submit against assetId.
        bytes32 digest = keccak256(
            abi.encode(
                ACTION_GRANT,
                block.chainid,
                address(ll),
                otherAssetId,
                _lastContentHash,
                _lastPurposeHash,
                _lastExpiresAt,
                aliceId,
                ll.nonces(aliceId)
            )
        );
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        // assetId binds into the digest, so signing for a different asset
        // makes the reconstructed challenge mismatch -> signature verification fails.
        vm.expectRevert(bytes("INVALID_WEBAUTHN_AUTH"));
        ll.grantConsent(assetId, aliceId, a);
    }

    function test_Negative_WrongPublicKeyReverts() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));

        uint256 attackerPk = 0xBAD5EED;
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, attackerPk, digest);

        vm.expectRevert(bytes("INVALID_WEBAUTHN_AUTH"));
        ll.grantConsent(assetId, aliceId, a);
    }

    function test_Negative_NonRequiredSubjectReverts() public {
        test_AT08_NonRequiredSubjectCannotGrant();
    }

    function test_Negative_DuplicateGrantCannotDoubleIncrement() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        _grant(assetId, aliceId, alicePk);

        bytes32 digest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        vm.expectRevert(bytes("ALREADY_ACTIVE"));
        ll.grantConsent(assetId, aliceId, a);

        (uint256 active,,,) = ll.getAssetStatus(assetId);
        assertEq(active, 1);
    }

    function test_Negative_DuplicateRevokeCannotDoubleDecrement() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        _grant(assetId, aliceId, alicePk);
        _revoke(assetId, aliceId, alicePk);

        bytes32 digest = _digest(ACTION_REVOKE, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, digest);

        vm.expectRevert(bytes("NOT_ACTIVE"));
        ll.revokeConsent(assetId, aliceId, a);

        (uint256 active,,,) = ll.getAssetStatus(assetId);
        assertEq(active, 0);
    }

    function test_Negative_ExpiredAssetNeverVerifiesValid() public {
        test_AT09_ExpiredAssetNeverValid();
    }

    // ---------------------------------------------------------------
    // Grant-as-revoke domain separation
    // ---------------------------------------------------------------

    function test_GrantSignatureCannotBeUsedAsRevoke() public {
        (bytes32 assetId,) = _createAsset(_oneSubject(aliceId));
        _grant(assetId, aliceId, alicePk);

        // Sign a GRANT digest (wrong domain) and try to use it for revoke.
        bytes32 grantDigest = _digest(ACTION_GRANT, assetId, aliceId, ll.nonces(aliceId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, alicePk, grantDigest);

        vm.expectRevert(bytes("INVALID_WEBAUTHN_AUTH"));
        ll.revokeConsent(assetId, aliceId, a);
    }

    // ---------------------------------------------------------------
    // internal action helpers
    // ---------------------------------------------------------------

    function _grant(bytes32 assetId, bytes32 subjectId, uint256 pk) internal {
        bytes32 digest = _digest(ACTION_GRANT, assetId, subjectId, ll.nonces(subjectId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, pk, digest);
        ll.grantConsent(assetId, subjectId, a);
    }

    function _revoke(bytes32 assetId, bytes32 subjectId, uint256 pk) internal {
        bytes32 digest = _digest(ACTION_REVOKE, assetId, subjectId, ll.nonces(subjectId));
        ILikenessLock.WebAuthnAuth memory a = WebAuthnSigner.auth(vm, pk, digest);
        ll.revokeConsent(assetId, subjectId, a);
    }
}
