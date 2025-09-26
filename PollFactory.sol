// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Voting} from "./Voting.sol";

/**
 * @title PollFactory
 * @notice Factory to deploy and track multiple Voting polls.
 */
contract PollFactory is Ownable {
	struct PollInfo {
		address poll;
		address owner;
		bool quadratic;
		uint256 startTime;
		uint256 endTime;
	}

	PollInfo[] public polls;
	event PollCreated(uint256 indexed id, address poll, address indexed owner);

	constructor(address _owner) Ownable(_owner) {}

	function createPoll(
		string[] calldata descriptions,
		bool quadratic,
		uint256 startTime,
		uint256 endTime
	) external returns (uint256 id, address pollAddr) {
		Voting poll = new Voting(descriptions, quadratic, startTime, endTime, msg.sender);
		polls.push(PollInfo({
			poll: address(poll),
			owner: msg.sender,
			quadratic: quadratic,
			startTime: startTime,
			endTime: endTime
		}));
		id = polls.length - 1;
		pollAddr = address(poll);
		emit PollCreated(id, pollAddr, msg.sender);
	}

	function totalPolls() external view returns (uint256) {
		return polls.length;
	}

	function getPoll(uint256 id) external view returns (PollInfo memory) {
		require(id < polls.length, "Bad id");
		return polls[id];
	}
}
