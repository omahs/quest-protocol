// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.16;

import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {IERC20, SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import {ReentrancyGuardUpgradeable} from '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import {RabbitHoleReceipt} from './RabbitHoleReceipt.sol';
import {QuestFactory} from './QuestFactory.sol';
import {IQuest} from './interfaces/IQuest.sol';

/// @title Quest
/// @author RabbitHole.gg
/// @notice This contract is the Erc20Quest contract. It is a quest that is redeemable for ERC20 tokens
contract Quest is ReentrancyGuardUpgradeable, PausableUpgradeable, OwnableUpgradeable, IQuest {
    using SafeERC20 for IERC20;

    RabbitHoleReceipt public rabbitHoleReceiptContract;
    QuestFactory public questFactoryContract;
    address public rewardToken;
    uint256 public endTime;
    uint256 public startTime;
    uint256 public totalParticipants;
    uint256 public rewardAmountInWei;
    bool public queued;
    string public questId;
    uint256 public redeemedTokens;
    uint16 public questFee;
    bool public hasWithdrawn;
    address public protocolFeeRecipient;
    mapping(uint256 => bool) private claimedList;
    string public jsonSpecCID;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address rewardTokenAddress_,
        uint256 endTime_,
        uint256 startTime_,
        uint256 totalParticipants_,
        uint256 rewardAmountInWei_,
        string memory questId_,
        address receiptContractAddress_,
        uint16 questFee_,
        address protocolFeeRecipient_
    ) external initializer {
        if (endTime_ <= block.timestamp) revert EndTimeInPast();
        if (endTime_ <= startTime_) revert EndTimeLessThanOrEqualToStartTime();
        endTime = endTime_;
        startTime = startTime_;
        rewardToken = rewardTokenAddress_;
        totalParticipants = totalParticipants_;
        rewardAmountInWei = rewardAmountInWei_;
        questId = questId_;
        questFactoryContract = QuestFactory(msg.sender);
        rabbitHoleReceiptContract = RabbitHoleReceipt(receiptContractAddress_);
        questFee = questFee_;
        hasWithdrawn = false;
        protocolFeeRecipient = protocolFeeRecipient_;
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
    }

    /// @dev set jsonSpecCID only if its empty
    /// @param jsonSpecCID_ The jsonSpecCID to set
    function setJsonSpecCID(string memory jsonSpecCID_) external onlyOwner {
        require(bytes(jsonSpecCID_).length > 0, 'jsonSpecCID cannot be empty');
        require(bytes(jsonSpecCID).length == 0, 'jsonSpecCID already set');

        jsonSpecCID = jsonSpecCID_;
        emit JsonSpecCIDSet(jsonSpecCID_);
    }

    /// @dev The amount of tokens the quest needs to pay all redeemers plus the protocol fee
    function totalTransferAmount() external view returns (uint256) {
        return this.maxTotalRewards() + this.maxProtocolReward();
    }

    /// @notice Queues the quest by marking it ready to start at the contract level. Marking a quest as queued does not mean that it is live. It also requires that the start time has passed
    /// @dev Requires that the balance of the rewards in the contract is greater than or equal to the maximum amount of rewards that can be claimed by all users and the protocol
    function queue() public virtual onlyOwner {
        if (IERC20(rewardToken).balanceOf(address(this)) < this.totalTransferAmount())
            revert TotalAmountExceedsBalance();
        queued = true;
        emit Queued(block.timestamp);
    }

    /// @notice Pauses the Quest
    /// @dev Only the owner of the Quest can call this function. Also requires that the Quest has started (not by date, but by calling the start function)
    function pause() external onlyOwner onlyStarted {
        _pause();
    }

    /// @notice Unpauses the Quest
    /// @dev Only the owner of the Quest can call this function. Also requires that the Quest has started (not by date, but by calling the start function)
    function unPause() external onlyOwner onlyStarted {
        _unpause();
    }

    /// @notice Marks token ids as claimed
    /// @param tokenIds_ The token ids to mark as claimed
    function _setClaimed(uint256[] memory tokenIds_) private {
        for (uint i = 0; i < tokenIds_.length; ) {
            claimedList[tokenIds_[i]] = true;
            unchecked {
                i++;
            }
        }
    }

    /// @notice Prevents reward withdrawal until the Quest has ended
    modifier onlyWithdrawAfterEnd() {
        if (block.timestamp < endTime) revert NoWithdrawDuringClaim();
        _;
    }

    /// @notice Checks if the Quest has started at the function level
    modifier onlyStarted() {
        if (!queued) revert NotStarted();
        _;
    }

    /// @notice Checks if quest has started both at the function level and at the start time
    modifier onlyQuestActive() {
        if (!queued) revert NotStarted();
        if (block.timestamp < startTime) revert ClaimWindowNotStarted();
        _;
    }

    modifier onlyProtocolFeeRecipientOrOwner() {
        require(msg.sender == protocolFeeRecipient || msg.sender == owner(), 'Not protocol fee recipient or owner');
        _;
    }

    /// @notice Allows user to claim the rewards entitled to them
    /// @dev User can claim based on the (unclaimed) number of tokens they own of the Quest
    function claim() external virtual nonReentrant onlyQuestActive whenNotPaused {
        uint[] memory tokens = rabbitHoleReceiptContract.getOwnedTokenIdsOfQuest(questId, msg.sender);

        if (tokens.length == 0) revert NoTokensToClaim();

        uint256 redeemableTokenCount = 0;
        for (uint i = 0; i < tokens.length; ) {
            if (!this.isClaimed(tokens[i])) {
                unchecked {
                    redeemableTokenCount++;
                }
            }
            unchecked {
                i++;
            }
        }

        if (redeemableTokenCount == 0) revert AlreadyClaimed();

        uint256 totalRedeemableRewards = _calculateRewards(redeemableTokenCount);
        _setClaimed(tokens);
        _transferRewards(totalRedeemableRewards);
        redeemedTokens = redeemedTokens + redeemableTokenCount;

        emit Claimed(msg.sender, rewardToken, totalRedeemableRewards);
    }

    /// @dev Function that gets the maximum amount of rewards that can be claimed by all users. It does not include the protocol fee
    /// @return The maximum amount of rewards that can be claimed by all users
    function maxTotalRewards() external view returns (uint256) {
        return totalParticipants * rewardAmountInWei;
    }

    /// @notice Function that gets the maximum amount of rewards that can be claimed by the protocol or the quest deployer
    /// @dev The 10_000 comes from Basis Points: https://www.investopedia.com/terms/b/basispoint.asp
    /// @return The maximum amount of rewards that can be claimed by the protocol or the quest deployer
    function maxProtocolReward() external view returns (uint256) {
        return (this.maxTotalRewards() * questFee) / 10_000;
    }

    /// @notice Internal function that transfers the rewards to the msg.sender
    /// @param amount_ The amount of rewards to transfer
    function _transferRewards(uint256 amount_) internal {
        IERC20(rewardToken).safeTransfer(msg.sender, amount_);
    }

    /// @notice Internal function that calculates the reward amount
    /// @dev It is possible for users to have multiple receipts (if they buy others on secondary markets)
    /// @param redeemableTokenCount_ The amount of tokens that can be redeemed
    /// @return The total amount of rewards that can be claimed by a user
    function _calculateRewards(uint256 redeemableTokenCount_) internal view returns (uint256) {
        return redeemableTokenCount_ * rewardAmountInWei;
    }

    /// @notice Function that allows either the protocol fee recipient or the owner to withdraw the remaining tokens in the contract
    /// @dev Every receipt minted should still be able to claim rewards (and cannot be withdrawn). This function can only be called after the quest end time
    function withdrawRemainingTokens() external onlyProtocolFeeRecipientOrOwner onlyWithdrawAfterEnd {
        require(!hasWithdrawn, 'Already withdrawn');

        uint unclaimedTokens = (this.receiptRedeemers() - redeemedTokens) * rewardAmountInWei;
        uint256 nonClaimableTokens = IERC20(rewardToken).balanceOf(address(this)) -
            this.protocolFee() -
            unclaimedTokens;
        hasWithdrawn = true;

        IERC20(rewardToken).safeTransfer(owner(), nonClaimableTokens);
        IERC20(rewardToken).safeTransfer(protocolFeeRecipient, this.protocolFee());
    }

    /// @notice Function that calculates the protocol fee
    function protocolFee() external view returns (uint256) {
        return (this.receiptRedeemers() * rewardAmountInWei * questFee) / 10_000;
    }

    // @notice Call the QuestFactory contract to get the amount of receipts that have been minted
    /// @return The amount of receipts that have been minted for the given quest
    function receiptRedeemers() public view returns (uint256) {
        return questFactoryContract.getNumberMinted(questId);
    }

    /// @notice Checks if a Receipt token id has been used to claim a reward
    /// @param tokenId_ The token id to check
    function isClaimed(uint256 tokenId_) external view returns (bool) {
        return claimedList[tokenId_] == true;
    }

    /// @dev Returns the reward amount
    function getRewardAmount() external view returns (uint256) {
        return rewardAmountInWei;
    }

    /// @dev Returns the reward token address
    function getRewardToken() external view returns (address) {
        return rewardToken;
    }

    /// @dev transfer all coins and tokens that is not the rewardToken to the contract owner.
    /// @param erc20Address_ The address of the ERC20 token to refund
    function refund(address erc20Address_) external onlyOwner {
        require(erc20Address_ != rewardToken, 'Cannot refund reward token');

        uint balance = address(this).balance;
        if (balance > 0) payable(msg.sender).transfer(balance);

        uint erc20Balance = IERC20(erc20Address_).balanceOf(address(this));
        if (erc20Balance > 0) IERC20(erc20Address_).safeTransfer(msg.sender, erc20Balance);
    }
}
