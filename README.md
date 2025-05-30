# bitty Lending Protocol

This repository contains the smart contracts source code and markets configuration for bitty Lending Protocol. The repository uses Hardhat as development environment for compilation, testing and deployment tasks.

## What is bitty Lending Protocol?

bitty Lending Protocol is a decentralized non-custodial NFT lending protocol where users can participate as depositors or borrowers. Depositors provide liquidity to the market to earn a passive income, while borrowers are able to borrow in an overcollateralized fashion, using NFTs as collateral.


## Thanks
bitty lending protocol fork from [bend-lending-protocol](https://github.com/BendDAO/bend-lending-protocol) and refers to the architecture design and adopts some of the code of [AAVE](https://github.com/aave).
We are very grateful to BEND and AAVE for providing us with an excellent DeFi platform.

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

## Markets configuration

The configurations related with the bitty Markets are located at `markets` directory. You can follow the `IBittyConfiguration` interface to create new Markets configuration or extend the current bitty configuration.

Each market should have his own Market configuration file, and their own set of deployment tasks, using the bitty market config and tasks as a reference.

## Test

You can run the full test suite with the following commands:

```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# install dependencies
yarn install

# A new Bash terminal is prompted, connected to the container
npm run test
```

## Deployments

For deploying bitty Lending Protocol, you can use the available scripts located at `package.json`. For a complete list, run `npm run` to see all the tasks.

### Prepare
```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# install dependencies
yarn install

# Runing NPM task
# npm run xxx
```

### Localhost dev deployment
```
# In first terminal
npm run hardhat:node

# In second terminal
npm run bitty:localhost:dev:migration
```

### Localhost full deployment
```
# In first terminal
npm run hardhat:node

# In second terminal
npx hardhat --network localhost "dev:deploy-mock-reserves"
# then update pool config reserve address

npx hardhat --network localhost "dev:deploy-mock-nfts"
# then update pool config nft address

npx hardhat --network localhost "dev:deploy-mock-aggregators" --pool Bitty
# then update pool config reserve aggregators address

npx hardhat --network localhost "dev:deploy-mock-bnft-registry" --pool Bitty
# then update pool config bnft registry address

npx hardhat --network localhost "dev:deploy-mock-bnft-tokens" --pool Bitty
```

### Rinkeby full deployment
```
# In one terminal
npm run bitty:rinkeby:full:migration
```

## Interact with bitty Lending Protocol in Mainnet via console

You can interact with bitty Lending Protocol at Mainnet network using the Hardhat console, in the scenario where the frontend is down or you want to interact directly. You can check the deployed addresses at [deployed-contracts](https://docs.bitty.xyz/developers/deployed-contracts).

Run the Hardhat console pointing to the Mainnet network:

```
npx hardhat --network main console
```

At the Hardhat console, you can interact with the protocol:

```
// Load the HRE into helpers to access signers
run("set-DRE")

// Import getters to instance any Bitty contract
const contractGetters = require('./helpers/contracts-getters');

// Load the first signer
const signer = await contractGetters.getFirstSigner();

// Lend pool instance
const lendPool = await contractGetters.getLendPool("0x3AF6fC17EbD751E4D11F5A1d6823b2aE64723B87");

// ERC20 token WETH Mainnet instance
const WETH = await contractGetters.getIErc20Detailed("0xbe4d36E2C69Aa9658e937f6cC584E60167484381");

// Approve 10 WETH to LendPool address
await WETH.connect(signer).approve(lendPool.address, ethers.utils.parseUnits('10'));

// Deposit 10 WETH
await lendPool.connect(signer).deposit(DAI.address, ethers.utils.parseUnits('10'), await signer.getAddress(), '0');
```

## Tools

This project integrates other tools commonly used alongside Hardhat in the ecosystem.

It also comes with a variety of other tools, preconfigured to work with the project code.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.js
node scripts/deploy.js
npx eslint '**/*.js'
npx eslint '**/*.js' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

## Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.template file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
