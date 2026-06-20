// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BGMI Arena — Battle Ground Monad India
/// @notice On-chain betting + reputation layer for autonomous AI agent battles.
///         3 AI agents fight; spectators bet MON on the winner (pari-mutuel).
///         Winning agent's wallet earns a cut; winning bettors split the rest.
contract Arena {
    address public owner;

    struct Agent {
        address wallet;
        string name;
        uint256 wins;
        uint256 losses;
        uint256 totalEarned;
    }

    Agent[3] public agents;

    uint256 public matchId;
    bool public bettingOpen;
    bool public matchActive;
    uint8 public lastWinner;

    // matchId => agentId => total MON bet on that agent
    mapping(uint256 => mapping(uint8 => uint256)) public totalBetOn;
    // matchId => bettor => agentId => amount staked
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public bets;
    // matchId => bettor => already claimed?
    mapping(uint256 => mapping(address => bool)) public claimed;
    // matchId => winning agentId (only valid once settled)
    mapping(uint256 => uint8) public matchWinner;
    // matchId => has the match been settled (endMatch called)?
    mapping(uint256 => bool) public matchSettled;

    uint256 public constant AGENT_PRIZE_PERCENT = 10; // 10% of pot to winning agent wallet
    uint256 public constant MIN_BET = 0.001 ether;

    event AgentsSet(address a, address b, address c);
    event MatchStarted(uint256 indexed matchId);
    event BetPlaced(uint256 indexed matchId, address indexed bettor, uint8 agentId, uint256 amount);
    event MatchEnded(uint256 indexed matchId, uint8 winnerId, uint256 pot);
    event Claimed(uint256 indexed matchId, address indexed bettor, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Register the 3 agents and their payout wallets. Owner only.
    function setAgents(
        address a, string memory nameA,
        address b, string memory nameB,
        address c, string memory nameC
    ) external onlyOwner {
        agents[0] = Agent(a, nameA, agents[0].wins, agents[0].losses, agents[0].totalEarned);
        agents[1] = Agent(b, nameB, agents[1].wins, agents[1].losses, agents[1].totalEarned);
        agents[2] = Agent(c, nameC, agents[2].wins, agents[2].losses, agents[2].totalEarned);
        emit AgentsSet(a, b, c);
    }

    /// @notice Open a new match for betting. Owner only.
    function startMatch() external onlyOwner {
        require(!matchActive, "Match already active");
        matchId++;
        bettingOpen = true;
        matchActive = true;
        emit MatchStarted(matchId);
    }

    /// @notice Stop accepting bets (call right before the fight starts). Owner only.
    function closeBetting() external onlyOwner {
        bettingOpen = false;
    }

    /// @notice Bet MON on an agent for the current match.
    function placeBet(uint8 agentId) external payable {
        require(bettingOpen, "Betting closed");
        require(agentId < 3, "Invalid agent");
        require(msg.value >= MIN_BET, "Bet too small");

        bets[matchId][msg.sender][agentId] += msg.value;
        totalBetOn[matchId][agentId] += msg.value;

        emit BetPlaced(matchId, msg.sender, agentId, msg.value);
    }

    /// @notice Settle the match with the winning agent. Pays the agent's cut. Owner only.
    function endMatch(uint8 winnerId) external onlyOwner {
        require(matchActive, "No active match");
        require(winnerId < 3, "Invalid winner");

        bettingOpen = false;
        matchActive = false;
        lastWinner = winnerId;
        matchWinner[matchId] = winnerId;
        matchSettled[matchId] = true;

        agents[winnerId].wins++;
        for (uint8 i = 0; i < 3; i++) {
            if (i != winnerId) agents[i].losses++;
        }

        uint256 totalPot = totalBetOn[matchId][0] + totalBetOn[matchId][1] + totalBetOn[matchId][2];

        if (totalPot > 0) {
            uint256 agentPrize = (totalPot * AGENT_PRIZE_PERCENT) / 100;
            if (agentPrize > 0 && agents[winnerId].wallet != address(0)) {
                agents[winnerId].totalEarned += agentPrize;
                (bool ok, ) = payable(agents[winnerId].wallet).call{value: agentPrize}("");
                require(ok, "Agent payout failed");
            }
        }

        emit MatchEnded(matchId, winnerId, totalPot);
    }

    /// @notice Claim your share of the betting pool if you backed the winner.
    /// @dev Pari-mutuel: payout = myBet / winnerPool * (90% of total pot).
    function claim(uint256 _matchId) external {
        require(matchSettled[_matchId], "Not settled");
        require(!claimed[_matchId][msg.sender], "Already claimed");

        uint8 winnerId = matchWinner[_matchId];
        uint256 myBet = bets[_matchId][msg.sender][winnerId];
        require(myBet > 0, "No winning bet");

        claimed[_matchId][msg.sender] = true;

        uint256 totalPot = totalBetOn[_matchId][0] + totalBetOn[_matchId][1] + totalBetOn[_matchId][2];
        uint256 winnerPool = totalBetOn[_matchId][winnerId];
        uint256 agentCut = (totalPot * AGENT_PRIZE_PERCENT) / 100;
        uint256 bettorPot = totalPot - agentCut;

        uint256 payout = (myBet * bettorPot) / winnerPool;
        (bool ok, ) = payable(msg.sender).call{value: payout}("");
        require(ok, "Claim transfer failed");

        emit Claimed(_matchId, msg.sender, payout);
    }

    /// @notice Preview a bettor's claimable winnings for a settled match (0 if none).
    function previewClaim(uint256 _matchId, address bettor) external view returns (uint256) {
        if (!matchSettled[_matchId] || claimed[_matchId][bettor]) return 0;
        uint8 winnerId = matchWinner[_matchId];
        uint256 myBet = bets[_matchId][bettor][winnerId];
        if (myBet == 0) return 0;
        uint256 totalPot = totalBetOn[_matchId][0] + totalBetOn[_matchId][1] + totalBetOn[_matchId][2];
        uint256 winnerPool = totalBetOn[_matchId][winnerId];
        uint256 bettorPot = totalPot - (totalPot * AGENT_PRIZE_PERCENT) / 100;
        return (myBet * bettorPot) / winnerPool;
    }

    function getAgent(uint8 id)
        external
        view
        returns (address wallet, string memory name, uint256 wins, uint256 losses)
    {
        Agent storage a = agents[id];
        return (a.wallet, a.name, a.wins, a.losses);
    }

    function getTotalPot(uint256 _matchId) external view returns (uint256) {
        return totalBetOn[_matchId][0] + totalBetOn[_matchId][1] + totalBetOn[_matchId][2];
    }

    function getBetAmounts(uint256 _matchId) external view returns (uint256, uint256, uint256) {
        return (totalBetOn[_matchId][0], totalBetOn[_matchId][1], totalBetOn[_matchId][2]);
    }

    function getMyBet(uint256 _matchId, address bettor, uint8 agentId) external view returns (uint256) {
        return bets[_matchId][bettor][agentId];
    }

    receive() external payable {}
}
