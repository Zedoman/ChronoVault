// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SchrodingerWallet is Ownable {
    struct Heir {
        address wallet;
        uint256 share;
        bool approved;
    }
    
    struct Activity {
        uint256 timestamp;
        string activityType;
        bool completed;
    }
    
    mapping(address => Heir[]) public heirs;
    mapping(address => bytes32) public heirMerkleRoots;
    mapping(address => Activity[]) public activities;
    
    uint256 public inactivityThreshold = 90 days;
    uint256 public lastActivity;
    address public gaiaOracle;
    bool public fundsLocked = true;
    
    event LivenessProven(address indexed user, string proofType);
    event HeirAdded(address indexed heir, uint256 share);
    event HeirApproved(address indexed heir);
    event FundsReleased(address indexed to, uint256 amount);
    event ActivityRecorded(address indexed user, string activityType);
    
    modifier onlyGaia() {
        require(msg.sender == gaiaOracle, "Only Gaia AI can call this");
        _;
    }
    
    constructor(address _gaiaOracle) Ownable(msg.sender) {
        gaiaOracle = _gaiaOracle;
        lastActivity = block.timestamp;
    }
    
    function addHeir(address _heir, uint256 _share, bytes32[] calldata _proof) external onlyOwner {
        bytes32 leaf = keccak256(abi.encodePacked(_heir, _share));
        require(MerkleProof.verify(_proof, heirMerkleRoots[msg.sender], leaf), "Invalid proof");
        
        heirs[msg.sender].push(Heir({
            wallet: _heir,
            share: _share,
            approved: false
        }));
        
        emit HeirAdded(_heir, _share);
    }
    
    function approveHeir(address _heir, uint256 _index) external {
        require(heirs[msg.sender][_index].wallet == _heir, "Invalid heir");
        heirs[msg.sender][_index].approved = true;
        emit HeirApproved(_heir);
    }
    
    function proveLivenessViaVoice(bytes memory /*_voiceSignature*/) external onlyGaia {
        _recordActivity("Voice Verification");
        emit LivenessProven(msg.sender, "Voice");
    }
    
    function proveLivenessViaRiddle(string memory /*_riddleId*/, string memory /*_answer*/) external onlyGaia {
        _recordActivity("Riddle Challenge");
        emit LivenessProven(msg.sender, "Riddle");
    }
    
    function releaseToHeirs() external {
        require(block.timestamp > lastActivity + inactivityThreshold, "Inactivity period not met");
        require(heirs[msg.sender].length > 0, "No heirs designated");
        
        uint256 totalApprovedShares;
        for (uint i = 0; i < heirs[msg.sender].length; i++) {
            if (heirs[msg.sender][i].approved) {
                totalApprovedShares += heirs[msg.sender][i].share;
            }
        }
        
        uint256 contractBalance = address(this).balance;
        for (uint i = 0; i < heirs[msg.sender].length; i++) {
            if (heirs[msg.sender][i].approved) {
                uint256 shareAmount = (contractBalance * heirs[msg.sender][i].share) / totalApprovedShares;
                payable(heirs[msg.sender][i].wallet).transfer(shareAmount);
                emit FundsReleased(heirs[msg.sender][i].wallet, shareAmount);
            }
        }
        
        fundsLocked = false;
    }
    
    function _recordActivity(string memory _activityType) private {
        activities[msg.sender].push(Activity({
            timestamp: block.timestamp,
            activityType: _activityType,
            completed: true
        }));
        lastActivity = block.timestamp;
        emit ActivityRecorded(msg.sender, _activityType);
    }
    
    receive() external payable {}
}