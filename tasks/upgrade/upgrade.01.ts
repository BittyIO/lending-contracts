import { task } from "hardhat/config";
import {
    deployBorrowLogicLibrary,
    deployGenericLogic,
    deployLendPool,
    deployLiquidateLogicLibrary,
    deployNftLogicLibrary,
    deployPunkGateway,
    deployReserveLogicLibrary,
    deploySupplyLogicLibrary,
    deployValidationLogic
} from "../../helpers/contracts-deployments";
import { deployWETHGateway } from "../deploy/deploy";

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




