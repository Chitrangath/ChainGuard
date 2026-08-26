// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Vault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        // VULNERABILITY: calls external before updating balance
        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send");
        balances[msg.sender] -= amount;
    }
}