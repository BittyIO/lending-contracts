# Bitty Lending Protocol

This repository contains the smart contracts source code and markets configuration for bitty Lending Protocol. The repository uses Hardhat as development environment for compilation, testing and deployment tasks.

## What is Bitty Lending Protocol?

Bitty Lending Protocol is a decentralized non-custodial NFT lending protocol where users can participate as depositors or borrowers. Depositors provide liquidity to the market to earn a passive income, while borrowers are able to borrow in an overcollateralized fashion, using NFTs as collateral.


## Thanks
Bitty lending protocol fork from [bend-lending-protocol](https://github.com/BendDAO/bend-lending-protocol) and refers to the architecture design and adopts some of the code of [AAVE](https://github.com/aave),
Thanks AAVE and BendDAO for the opensouce spirit & code.

## Setup

Create an enviroment file named `.env` and fill the next enviroment variables

```
# private key for deoployer
PRIVATE_KEY=""

# Add Alchemy or Infura provider keys, alchemy takes preference at the config level
ALCHEMY_KEY=""
INFURA_KEY=""

# Optional Etherscan key, to automatize the verification of the contracts at Etherscan
ETHERSCAN_KEY=""

```

## Deployments

### Sepolia full deployment
```
npx hardhat deploy:deploy-all --network sepolia
```
