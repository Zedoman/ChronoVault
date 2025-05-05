// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./SchrodingerWallet.sol";

contract GaiaOracle {
    address public admin;
    SchrodingerWallet public schrodingerWallet;
    
    mapping(string => bytes32) public riddleAnswers; // riddleId => hashedAnswer
    
    event RiddleCreated(string indexed riddleId, string question);
    event BiometricVerified(address indexed user);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    // Single constructor with optional parameter
    constructor(address payable _schrodingerWallet) {
        admin = msg.sender;
        if (_schrodingerWallet != address(0)) {
            schrodingerWallet = SchrodingerWallet(_schrodingerWallet);
        }
    }
    
    // Alternative way to set the wallet if not set in constructor
    function setSchrodingerWallet(address payable _schrodingerWallet) external onlyAdmin {
        require(address(schrodingerWallet) == address(0), "Wallet already set");
        schrodingerWallet = SchrodingerWallet(_schrodingerWallet);
    }
    
    function createRiddle(string memory _riddleId, string memory _question, string memory _answer) external onlyAdmin {
        riddleAnswers[_riddleId] = keccak256(abi.encodePacked(_answer));
        emit RiddleCreated(_riddleId, _question);
    }
    
    function verifyVoiceAndProveLiveness(address _user, bytes memory _voiceSignature) external onlyAdmin {
        // In a real implementation, this would verify the voice signature
        schrodingerWallet.proveLivenessViaVoice(_voiceSignature);
        emit BiometricVerified(_user);
    }
    
    function verifyRiddleAndProveLiveness(address _user, string memory _riddleId, string memory _answer) external onlyAdmin {
        require(riddleAnswers[_riddleId] == keccak256(abi.encodePacked(_answer)), "Incorrect answer");
        schrodingerWallet.proveLivenessViaRiddle(_riddleId, _answer);
        emit BiometricVerified(_user);
    }
}