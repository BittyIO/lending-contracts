# Bitty Lending Protocol

This repository contains the smart contracts source code and markets configuration for bitty Lending Protocol. The repository uses Hardhat as development environment for compilation, testing and deployment tasks.

## What is Bitty Lending Protocol?

Bitty Lending Protocol is a decentralized non-custodial NFT lending protocol where users can participate as depositors or borrowers. Depositors provide liquidity to the market to earn a passive income, while borrowers are able to borrow in an overcollateralized fashion, using NFTs as collateral.


## Thanks
Bitty lending protocol fork from [bend-lending-protocol](https://github.com/BendDAO/bend-lending-protocol) and refers to the architecture design and adopts some of the code of [AAVE](https://github.com/aave),
Thanks AAVE and BendDAO for the opensouce spirit & code.

```

## Setup

The repository uses Docker Compose to manage sensitive keys and load the configuration. Prior any action like test or deploy, you must run `docker-compose up` to start the `contracts-env` container, and then connect to the container console via `docker-compose exec contracts-env bash`.

Follow the next steps to setup the repository:

- Install `docker` and `docker-compose`
- Create an environment file named `.env` and fill the next environment variables

```
# Mnemonic, only first address will be used
MNEMONIC=""

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
