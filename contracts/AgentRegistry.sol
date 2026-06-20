// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC-8004 "Trustless Agents" — minimal Identity + Reputation registries for
// BGMI (Battle Ground Monad India). These give every agent in the arena a
// portable on-chain identity and a verifiable track record, so bettors stake on
// a real reputation instead of a stranger's JPEG.
//
// Faithful to the ERC-8004 spec's intent (Identity = ERC-721 passport,
// Reputation = feedback signals with on-chain aggregation) but trimmed for a
// hackathon deploy. The Validation Registry is intentionally left for the
// roadmap.
//
// Remix deploy order:
//   1. Deploy IdentityRegistry  -> copy its address.
//   2. Deploy ReputationRegistry(identityAddress) with the address above.
//
// OpenZeppelin imports resolve automatically in Remix.

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title IdentityRegistry (ERC-8004 Identity)
/// @notice An ERC-721 "passport" for each agent. The tokenURI points at the
///         agent's metadata (name, image, capabilities) on IPFS/HTTP.
contract IdentityRegistry is ERC721URIStorage {
    uint256 private _nextId = 1;

    event Registered(uint256 indexed agentId, address indexed owner, string agentURI);

    constructor() ERC721("BGMI Agent", "BGMIA") {}

    /// @notice Mint a new agent identity owned by the caller.
    /// @param agentURI Metadata URI (e.g. ipfs://... or https://...).
    /// @return agentId The freshly minted agent id.
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextId++;
        _mint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        emit Registered(agentId, msg.sender, agentURI);
    }

    /// @notice Update your agent's metadata URI. Owner of the token only.
    function setAgentURI(uint256 agentId, string calldata agentURI) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _setTokenURI(agentId, agentURI);
    }

    /// @notice Total number of agents ever registered.
    function totalAgents() external view returns (uint256) {
        return _nextId - 1;
    }

    /// @notice Whether an agent id has been minted.
    function exists(uint256 agentId) public view returns (bool) {
        return _ownerOf(agentId) != address(0);
    }
}

interface IIdentityRegistry {
    function exists(uint256 agentId) external view returns (bool);
    function ownerOf(uint256 agentId) external view returns (address);
}

/// @title ReputationRegistry (ERC-8004 Reputation)
/// @notice A public bulletin board of feedback signals per agent, plus a
///         domain helper to record match outcomes as on-chain reputation. This
///         is what turns "watch a game" into "bet on a track record".
contract ReputationRegistry {
    IIdentityRegistry public immutable identity;

    struct Feedback {
        address client; // who left the signal
        int128 value; // normalized score (e.g. -100..100), see valueDecimals
        uint8 valueDecimals; // decimals applied to `value`
        bytes32 tag; // short label, e.g. "quality", "kills"
        string uri; // optional pointer to a detailed review file
        uint64 timestamp;
    }

    // agentId => feedback signals
    mapping(uint256 => Feedback[]) private _feedback;

    // On-chain aggregates so any dApp can read a track record cheaply.
    mapping(uint256 => uint256) public matchesPlayed;
    mapping(uint256 => uint256) public wins;
    mapping(uint256 => uint256) public totalKills;

    event FeedbackGiven(uint256 indexed agentId, address indexed client, int128 value, bytes32 tag, string uri);
    event MatchRecorded(uint256 indexed agentId, uint256 indexed matchId, uint256 kills, bool won);

    constructor(address identityRegistry) {
        identity = IIdentityRegistry(identityRegistry);
    }

    /// @notice Post a feedback signal about an agent. Self-feedback is blocked,
    ///         mirroring the ERC-8004 reference behaviour.
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        bytes32 tag,
        string calldata uri
    ) external {
        require(identity.exists(agentId), "Unknown agent");
        require(identity.ownerOf(agentId) != msg.sender, "No self-feedback");
        _feedback[agentId].push(
            Feedback(msg.sender, value, valueDecimals, tag, uri, uint64(block.timestamp))
        );
        emit FeedbackGiven(agentId, msg.sender, value, tag, uri);
    }

    /// @notice Record a match outcome as reputation. Called by the arena host
    ///         after a battle settles. On testnet this is intentionally open;
    ///         in production a Validation Registry / oracle would gate it.
    function recordMatchResult(uint256 agentId, uint256 matchId, uint256 kills, bool won) external {
        require(identity.exists(agentId), "Unknown agent");
        matchesPlayed[agentId]++;
        totalKills[agentId] += kills;
        if (won) wins[agentId]++;
        emit MatchRecorded(agentId, matchId, kills, won);
    }

    /// @notice Cheap track-record read for the UI / bettors.
    function getSummary(uint256 agentId)
        external
        view
        returns (uint256 played, uint256 agentWins, uint256 kills)
    {
        return (matchesPlayed[agentId], wins[agentId], totalKills[agentId]);
    }

    function feedbackCount(uint256 agentId) external view returns (uint256) {
        return _feedback[agentId].length;
    }

    function getFeedback(uint256 agentId, uint256 index) external view returns (Feedback memory) {
        return _feedback[agentId][index];
    }
}
