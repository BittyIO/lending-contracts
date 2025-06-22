import { task } from "hardhat/config";
import { ZERO_ADDRESS } from "../../helpers/constants";
import {
    deployBorrowLogicLibrary,
    deployConfiguratorLogicLibrary,
    deployGenericLogic,
    deployLendPool,
    deployLiquidateLogicLibrary,
    deployNftLogicLibrary,
    deployPunkGateway,
    deployReserveLogicLibrary,
    deploySupplyLogicLibrary,
    deployValidationLogic
} from "../../helpers/contracts-deployments";
import { getDeploySigner, getPunkGateway } from "../../helpers/contracts-getters";
import { getContractAddressInDb } from "../../helpers/contracts-helpers";
import { BittyProxyAdminFactory, LendPoolAddressesProviderFactory } from "../../types";
import { deployWETHGateway, getWETHGateway } from "../sepolia/deploy";

task(`upgrade:referral`, ``)
    .addFlag("verify", `Verify contracts at Etherscan`)
    .setAction(async ({ verify }, { run }) => {
        await run("set-DRE");
        await run("compile");

        console.log("Deploying new WETHGateway implementation");
        const wethGatewayImpl = await deployWETHGateway(verify);
        console.log("WETHGateway: new implementation %s", wethGatewayImpl.address);
        console.log("Deploying new PunkGateway implementation");
        const punkGatewayImpl = await deployPunkGateway(verify);
        console.log("PunkGateway: new implementation %s", punkGatewayImpl.address);

        console.log("Deploying new lend pool libraries");
        const reserveLogic = await deployReserveLogicLibrary(verify);
        const genericLogic = await deployGenericLogic(verify);
        await deployNftLogicLibrary(verify);
        await deployValidationLogic(reserveLogic, genericLogic, verify);
        await deploySupplyLogicLibrary(verify);
        await deployBorrowLogicLibrary(verify);
        await deployLiquidateLogicLibrary(verify);

        console.log("Deploying new lend pool implementation");
        let lendPoolImpl = await deployLendPool(verify);
        console.log("LendPool: new implementation %s", lendPoolImpl.address);
    });


task(`abi:referral`, ``)
    .setAction(async ({ }, { run }) => {
        await run("set-DRE");
        await run("compile");
        console.log("0x0000000000000000000000000000000000000000000000000000000000000000");
        const wethGateway = await getWETHGateway();
        const wethGatewayImpl = await getContractAddressInDb("WETHGatewayImpl");
        console.log("upgrade WETHGateway %s to %s", wethGateway.address, wethGatewayImpl);
        let data = BittyProxyAdminFactory.connect(
            ZERO_ADDRESS,
            await getDeploySigner()
        ).interface.encodeFunctionData("upgrade", [wethGateway.address, wethGatewayImpl]);
        console.log('WETHGateway upgrade data', data);
        const punkGateway = await getPunkGateway();
        const punkGatewayImpl = await getContractAddressInDb("PunkGatewayImpl");
        console.log("upgrade PunkGateway %s to %s", punkGateway.address, punkGatewayImpl);
        data = BittyProxyAdminFactory.connect(
            ZERO_ADDRESS,
            await getDeploySigner()
        ).interface.encodeFunctionData("upgrade", [punkGateway.address, punkGatewayImpl]);
        console.log('PunkGateway upgrade data', data);


        const lendPoolImpl = await getContractAddressInDb("LendPoolImpl");
        console.log("upgrade LendPool to %s", lendPoolImpl);
        data = LendPoolAddressesProviderFactory.connect(
            ZERO_ADDRESS,
            await getDeploySigner()
        ).interface.encodeFunctionData("setLendPoolImpl", [lendPoolImpl, []]);
        console.log('LendPool upgrade data', data);
    });