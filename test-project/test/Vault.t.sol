// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Vault.sol";

contract VaultTest is Test {
    Vault vault;
    address user = address(0xBEEF);

    function setUp() public {
        vault = new Vault();
        vm.deal(user, 100 ether);
    }

    function test_deposit() public {
        vm.prank(user);
        vault.deposit{value: 10 ether}();
        assertEq(vault.balances(user), 10 ether);
    }

    function test_withdraw() public {
        vm.prank(user);
        vault.deposit{value: 10 ether}();
        vm.prank(user);
        vault.withdraw(5 ether);
        assertEq(vault.balances(user), 5 ether);
    }

    function test_revert_on_insufficient_balance() public {
        vm.prank(user);
        vm.expectRevert("Insufficient balance");
        vault.withdraw(1 ether);
    }
}