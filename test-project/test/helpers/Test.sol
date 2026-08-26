// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function prank(address sender) external;
    function expectRevert(bytes calldata revertData) external;
}

abstract contract Test {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function setUp() public virtual {}

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "assertion failed");
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "assertion failed");
    }
}
