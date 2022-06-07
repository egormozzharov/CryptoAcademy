// SPDX-License-Identifier: MIT
import "./interfaces/IERC20.sol";

pragma solidity ^0.8.0;

contract DAO {
    struct Proposal {
        uint256 id;
        string description;
        bytes callData;
        address recipient;
        uint positiveVotes;
        uint negativeVotes;
        bool isFinished;
        uint finishTime;
    }

    address public chairPerson;
    address public voteToken;
    uint public minimumQuorum;
    uint public debatingPeriod;
    uint private proposalId;

    mapping(address => uint) public deposits;
    mapping(uint => Proposal) public proposals;
    mapping(uint => mapping (address => bool)) public votedForProposal;
    mapping(address => uint) public widthdrawTimestamp;

    event Deposited(address indexed from, uint amount);
    event Widthdrawn(address indexed to, uint amount);
    event ProposalAdded(uint id, string description, bytes callData, address recipient);
    event ProposalVoted(uint id, bool isPositive, address voter, uint amount);
    event ProposalFinished(uint id);
    event ProposalExecuted(uint id);

    modifier onlyChairPerson {
        require(msg.sender == chairPerson, "Only chairperson can call this function");
        _;
    }

    constructor(address _chairPerson, address _voteToken, uint _minimumQuorum, uint _debatingPeriod) {
        require(_chairPerson != address(0), "ChairPerson cannot be the zero address");
        require(_voteToken != address(0), "VoteToken cannot be the zero address");
        chairPerson = _chairPerson;
        voteToken = _voteToken;
        minimumQuorum = _minimumQuorum;
        debatingPeriod = _debatingPeriod;
    }

    function deposit(uint256 amount) external {
        deposits[msg.sender] = deposits[msg.sender] + amount;
        IERC20(voteToken).transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function widthdraw() external {
        require(widthdrawTimestamp[msg.sender] >= block.timestamp, "You can only widthdraw when all your deposits debating periods has passed");
        uint amount = deposits[msg.sender];
        deposits[msg.sender] = 0;
        IERC20(voteToken).transferFrom(address(this), msg.sender, amount);
        emit Widthdrawn(msg.sender, amount);
    }

    function addProposal(string calldata _description, bytes calldata _callData, address _recipient) external onlyChairPerson {
        proposalId++;
        proposals[proposalId] = Proposal({
            id: proposalId,
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
        require(deposits[msg.sender] > 0, "You must have a deposit to vote");
        require(votedForProposal[proposalId][msg.sender] == false, "You have already voted on this proposal");
        require(!proposal.isFinished, "Proposal is already finished");
        if (isPositive)
            proposal.positiveVotes += deposits[msg.sender];
        else 
            proposal.negativeVotes += deposits[msg.sender];
        if (proposal.finishTime > widthdrawTimestamp[msg.sender])
            widthdrawTimestamp[msg.sender] = proposal.finishTime;
        votedForProposal[proposalId][msg.sender] = true;
        emit ProposalVoted(_proposalId, isPositive, msg.sender, deposits[msg.sender]);
    }

    function finishProposal(uint _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isFinished == false, "Proposal is already finished");
        require(proposal.finishTime < block.timestamp, "Debating period has not yet ended");
        require(proposal.positiveVotes + proposal.negativeVotes >= minimumQuorum, "Quorum conditions are not met");
        if (proposal.positiveVotes > proposal.negativeVotes) {
            address recipient = proposal.recipient;
            (bool success, bytes memory result) = recipient.call(proposal.callData);
            emit ProposalExecuted(_proposalId);
        }
        proposal.isFinished = true;
        emit ProposalFinished(_proposalId);
    }
}
