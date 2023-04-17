// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.16;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {IQuestFactory} from './interfaces/IQuestFactory.sol';
import {Quest as QuestContract} from './Quest.sol';
import {RabbitHoleReceipt} from './RabbitHoleReceipt.sol';
import {OwnableUpgradeable} from './OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts/proxy/Clones.sol';

/// @title QuestFactory
/// @author RabbitHole.gg
/// @dev This contract is used to create quests and mint receipts
contract QuestFactory is Initializable, OwnableUpgradeable, AccessControlUpgradeable, IQuestFactory {
    bytes32 public constant CREATE_QUEST_ROLE = keccak256('CREATE_QUEST_ROLE');

    // storage vars. Insert new vars at the end to keep the storage layout the same.
    struct Quest {
        mapping(address => bool) addressMinted;
        address questAddress;
        uint totalParticipants;
        uint numberMinted;
    }
    address public claimSignerAddress;
    address public protocolFeeRecipient;
    address public erc20QuestAddress;
    address public erc1155QuestAddress;
    mapping(string => Quest) public quests;
    RabbitHoleReceipt public rabbitHoleReceiptContract;
    address public rabbitHoleTicketsContract;
    mapping(address => bool) public rewardAllowlist;
    uint16 public questFee;
    uint public mintFee;
    address public mintFeeRecipient;
    uint256 private locked;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address claimSignerAddress_,
        address rabbitHoleReceiptContract_,
        address protocolFeeRecipient_,
        address erc20QuestAddress_,
        address ownerAddress_
    ) external initializer {
        __Ownable_init(ownerAddress_);
        __AccessControl_init();
        grantDefaultAdminAndCreateQuestRole(ownerAddress_);
        claimSignerAddress = claimSignerAddress_;
        rabbitHoleReceiptContract = RabbitHoleReceipt(rabbitHoleReceiptContract_);
        protocolFeeRecipient = protocolFeeRecipient_;
        questFee = 2_000;
        erc20QuestAddress = erc20QuestAddress_;
        locked = 1;
    }

    /// @dev ReentrancyGuard modifier from solmate, copied here because it was added after storage layout was finalized on first deploy
    /// @dev from https://github.com/transmissions11/solmate/blob/main/src/utils/ReentrancyGuard.sol
    modifier nonReentrant() virtual {
        require(locked == 1, "REENTRANCY");
        locked = 2;
        _;
        locked = 1;
    }

    modifier claimChecks(string memory questId_, bytes32 hash_, bytes memory signature_) {
        Quest storage currentQuest = quests[questId_];
        if (currentQuest.numberMinted + 1 > currentQuest.totalParticipants) revert OverMaxAllowedToMint();
        if (currentQuest.addressMinted[msg.sender]) revert AddressAlreadyMinted();
        if (!QuestContract(currentQuest.questAddress).queued()) revert QuestNotQueued();
        if (block.timestamp < QuestContract(currentQuest.questAddress).startTime()) revert QuestNotStarted();
        if (block.timestamp > QuestContract(currentQuest.questAddress).endTime()) revert QuestEnded();
        if (keccak256(abi.encodePacked(msg.sender, questId_)) != hash_) revert InvalidHash();
        if (recoverSigner(hash_, signature_) != claimSignerAddress) revert AddressNotSigned();
        _;
    }

    modifier sufficientMintFee() {
        require(msg.value >= mintFee, "Insufficient mint fee");
        _;
    }

    /// @dev Create an erc20 quest, only accounts with the CREATE_QUEST_ROLE can create quests
    /// @param rewardTokenAddress_ The contract address of the reward token
    /// @param endTime_ The end time of the quest
    /// @param startTime_ The start time of the quest
    /// @param totalParticipants_ The total amount of participants (accounts) the quest will have
    /// @param rewardAmount_ The reward amount for an erc20 quest
    /// @param contractType_ Deprecated, it was used when we had 1155 reward support
    /// @param questId_ The id of the quest
    /// @return address the quest contract address
    function createQuest(
        address rewardTokenAddress_,
        uint256 endTime_,
        uint256 startTime_,
        uint256 totalParticipants_,
        uint256 rewardAmount_,
        string memory contractType_,
        string memory questId_
    ) external onlyRole(CREATE_QUEST_ROLE) returns (address) {
        Quest storage currentQuest = quests[questId_];
        if (currentQuest.questAddress != address(0)) revert QuestIdUsed();
        if (rewardAllowlist[rewardTokenAddress_] == false) revert RewardNotAllowed();
        if (erc20QuestAddress == address(0)) revert Erc20QuestAddressNotSet();
        address newQuest = Clones.cloneDeterministic(erc20QuestAddress, keccak256(abi.encodePacked(msg.sender, questId_)));

        emit QuestCreated(
            msg.sender,
            address(newQuest),
            questId_,
            contractType_,
            rewardTokenAddress_,
            endTime_,
            startTime_,
            totalParticipants_,
            rewardAmount_
        );
        currentQuest.questAddress = address(newQuest);
        currentQuest.totalParticipants = totalParticipants_;

        QuestContract(newQuest).initialize(
            rewardTokenAddress_,
            endTime_,
            startTime_,
            totalParticipants_,
            rewardAmount_,
            questId_,
            address(rabbitHoleReceiptContract),
            questFee,
            protocolFeeRecipient
        );
        QuestContract(newQuest).transferOwnership(msg.sender);
        return newQuest;
    }

    /// @dev set erc20QuestAddress
    /// @param erc20QuestAddress_ The address of the erc20 quest
    function setErc20QuestAddress(address erc20QuestAddress_) public onlyOwner {
        erc20QuestAddress = erc20QuestAddress_;
    }

    /// @dev grant the default admin role and the create quest role to the owner
    /// @param account_ The account to grant admin and create quest roles
    function grantDefaultAdminAndCreateQuestRole(address account_) internal {
        _grantRole(DEFAULT_ADMIN_ROLE, account_);
        _grantRole(CREATE_QUEST_ROLE, account_);
    }

    /// @dev set the claim signer address
    /// @param claimSignerAddress_ The address of the claim signer
    function setClaimSignerAddress(address claimSignerAddress_) public onlyOwner {
        claimSignerAddress = claimSignerAddress_;
    }

    /// @dev set the protocol fee recipient
    /// @param protocolFeeRecipient_ The address of the protocol fee recipient
    function setProtocolFeeRecipient(address protocolFeeRecipient_) public onlyOwner {
        if (protocolFeeRecipient_ == address(0)) revert AddressZeroNotAllowed();
        protocolFeeRecipient = protocolFeeRecipient_;
    }

    /// @dev set the mintFeeRecipient
    /// @param mintFeeRecipient_ The address of the mint fee recipient
    function setMintFeeRecipient(address mintFeeRecipient_) public onlyOwner {
        if (mintFeeRecipient_ == address(0)) revert AddressZeroNotAllowed();
        mintFeeRecipient = mintFeeRecipient_;
    }

    /// @dev get the mintFeeRecipient return the protocol fee recipient if the mint fee recipient is not set
    /// @return address the mint fee recipient
    function getMintFeeRecipient() public view returns (address) {
        if (mintFeeRecipient == address(0)) {
            return protocolFeeRecipient;
        }
        return mintFeeRecipient;
    }

    /// @dev set the rabbithole receipt contract
    /// @param rabbitholeReceiptContract_ The address of the rabbithole receipt contract
    function setRabbitHoleReceiptContract(address rabbitholeReceiptContract_) external onlyOwner {
        rabbitHoleReceiptContract = RabbitHoleReceipt(rabbitholeReceiptContract_);
    }

    /// @dev set or remave a contract address to be used as a reward
    /// @param rewardAddress_ The contract address to set
    /// @param allowed_ Whether the contract address is allowed or not
    function setRewardAllowlistAddress(address rewardAddress_, bool allowed_) public onlyOwner {
        rewardAllowlist[rewardAddress_] = allowed_;
    }

    /// @dev set the quest fee
    /// @notice the quest fee should be in Basis Point units
    /// @param questFee_ The quest fee value
    function setQuestFee(uint16 questFee_) public onlyOwner {
        if (questFee_ > 10_000) revert QuestFeeTooHigh();
        questFee = questFee_;
    }

    /// @dev set the mint fee
    /// @notice the mint fee in ether
    /// @param mintFee_ The mint fee value
    function setMintFee(uint mintFee_) public onlyOwner {
        mintFee = mintFee_;
        emit MintFeeSet(mintFee_);
    }

    /// @dev return the number of minted receipts for a quest
    /// @param questId_ The id of the quest
    function getNumberMinted(string memory questId_) external view returns (uint) {
        return quests[questId_].numberMinted;
    }

    /// @dev return data in the quest struct for a questId
    /// @param questId_ The id of the quest
    function questInfo(string memory questId_) external view returns (address, uint, uint) {
        Quest storage currentQuest = quests[questId_];
        return (currentQuest.questAddress, currentQuest.totalParticipants, currentQuest.numberMinted);
    }

    /// @dev return status of whether an address has minted a receipt for a quest
    /// @param questId_ The id of the quest
    /// @param address_ The address to check
    /// @return Minted status
    function getAddressMinted(string memory questId_, address address_) external view returns (bool) {
        return quests[questId_].addressMinted[address_];
    }

    /// @dev recover the signer from a hash and signature
    /// @param hash_ The hash of the message
    /// @param signature_ The signature of the hash
    function recoverSigner(bytes32 hash_, bytes memory signature_) public pure returns (address) {
        bytes32 messageDigest = keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n32', hash_));
        return ECDSAUpgradeable.recover(messageDigest, signature_);
    }

    function claimRewards(string memory questId_, bytes32 hash_, bytes memory signature_) external payable nonReentrant sufficientMintFee claimChecks(questId_, hash_, signature_) {
        Quest storage currentQuest = quests[questId_];

        currentQuest.addressMinted[msg.sender] = true;
        ++currentQuest.numberMinted;
        QuestContract(currentQuest.questAddress).singleClaim(msg.sender);

        if(mintFee > 0) processMintFee();
    }

    /// @dev mint a RabbitHole Receipt. Note: this contract must be set as Minter on the receipt contract
    /// @param questId_ The id of the quest
    /// @param hash_ The hash of the message
    /// @param signature_ The signature of the hash
    function mintReceipt(string memory questId_, bytes32 hash_, bytes memory signature_) external payable nonReentrant sufficientMintFee claimChecks(questId_, hash_, signature_) {
        Quest storage currentQuest = quests[questId_];

        currentQuest.addressMinted[msg.sender] = true;
        ++currentQuest.numberMinted;
        rabbitHoleReceiptContract.mint(msg.sender, questId_);

        emit ReceiptMinted(msg.sender, quests[questId_].questAddress, rabbitHoleReceiptContract.getTokenId(), questId_);

        if(mintFee > 0) processMintFee();
    }

    function processMintFee() internal {
        // Refund any excess payment
        uint change = msg.value - mintFee;
        if (change > 0) {
            (bool success, ) = msg.sender.call{value: change}("");
            require(success, "Failed to return change");
            emit ExtraMintFeeReturned(msg.sender, change);
        }

        // Send the mint fee to the mint fee recipient
        (bool success, ) = getMintFeeRecipient().call{value: mintFee}("");
        require(success, "Failed to send mint fee");
    }
}
