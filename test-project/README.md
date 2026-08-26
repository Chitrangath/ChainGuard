# ChainGuard Test Project

**WARNING: THIS PROJECT IS INTENTIONALLY VULNERABLE.**
**DO NOT DEPLOY TO MAINNET.**

This is a minimal Foundry project used for testing the ChainGuard security analysis pipeline.

## Vulnerabilities

The `Vault` contract contains an intentional reentrancy vulnerability:

- `withdraw()` sends ETH to `msg.sender` before updating `balances`
- This allows an attacker to re-enter `withdraw()` and drain funds

## Running Tests

```bash
forge test
```

## Running Slither

```bash
slither .
```
