// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IStaking.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DAO is ReentrancyGuard {
    struct Proposal {
        bool isFinished;
        address recipient;
        uint positiveVotes;
        uint negativeVotes;
        uint finishTime;
        string description;
        bytes callData;
    }

    uint public immutable minimumQuorum;
    uint public immutable debatingPeriod;
    address public immutable chairPerson;
    address public stakingContract;
    uint private proposalId;

    mapping(uint => Proposal) public proposals;
    mapping(uint => mapping (address => bool)) public votedForProposal;
    mapping(address => uint) public widthdrawTimestamp;

    event Deposited(address indexed from, uint amount);
    event Widthdrawn(address indexed to, uint amount);
    event ProposalAdded(uint id, string description, bytes callData, address recipient);
    event ProposalVoted(uint id, bool isPositive, address voter, uint amount);
    event ProposalFinished(uint id);
    event ProposalExecuted(uint id);

    error ExternalContractExecutionFailed();

    modifier onlyChairPerson {
        require(msg.sender == chairPerson, "Only chairperson can call this function");
        _;
    }

    constructor(address _chairPerson, uint _minimumQuorum, uint _debatingPeriod) {
        require(_chairPerson != address(0), "ChairPerson cannot be the zero address");
        chairPerson = _chairPerson;
        minimumQuorum = _minimumQuorum;
        debatingPeriod = _debatingPeriod;
    }

    function addProposal(string calldata _description, bytes calldata _callData, address _recipient) external onlyChairPerson {
        require(_recipient != address(0), "Recipient cannot be the zero address");
        proposalId++;
        proposals[proposalId] = Proposal({
            description: _description,
            callData: _callData,
            recipient: _recipient,
            positiveVotes: 0,
            negativeVotes: 0,
            isFinished: false,
            finishTime: block.timestamp + debatingPeriod
        });
        emit ProposalAdded(proposalId, _description, _callData, _recipient);
    }

    function voteProposal(uint _proposalId, bool isPositive) external {
        Proposal storage proposal = proposals[_proposalId];
        uint deposit = getDeposit(msg.sender);
        require(deposit > 0, "You must have a deposit to vote");
        require(votedForProposal[proposalId][msg.sender] == false, "You have already voted on this proposal");
        require(!proposal.isFinished, "Proposal is already finished");
        if (isPositive)
            proposal.positiveVotes += deposit;
        else 
            proposal.negativeVotes += deposit;
        if (proposal.finishTime > widthdrawTimestamp[msg.sender])
            widthdrawTimestamp[msg.sender] = proposal.finishTime;
        votedForProposal[proposalId][msg.sender] = true;
        emit ProposalVoted(_proposalId, isPositive, msg.sender, deposit);
    }

    function finishProposal(uint _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isFinished == false, "Proposal is already finished");
        require(proposal.finishTime < block.timestamp, "Debating period has not yet ended");
        require(proposal.positiveVotes + proposal.negativeVotes >= minimumQuorum, "Quorum conditions are not met");
        if (proposal.positiveVotes > proposal.negativeVotes) {
            address recipient = proposal.recipient;
            (bool success, bytes memory returndata) = recipient.call(proposal.callData);
            if (success)
                emit ProposalExecuted(_proposalId);
            else {
                // https://ethereum.stackexchange.com/questions/109457/how-to-bubble-up-a-custom-error-when-using-delegatecall
                if (returndata.length == 0) 
                    revert();
                assembly {
                    revert(add(32, returndata), mload(returndata))
                }
            }
        }
        proposal.isFinished = true;
        emit ProposalFinished(_proposalId);
    }

    function setStaking(address _address) external {
        stakingContract = _address;
    }

    function lastVotingEndTime(address _address) external view returns (uint) {
        return widthdrawTimestamp[_address];
    }

    function getDeposit(address _address) private nonReentrant() returns(uint) {
        require(stakingContract != address(0), "Staking Contract address should be set");
        uint deposit = IStaking(stakingContract).balanceOf(_address);
        return deposit;
    }
}
