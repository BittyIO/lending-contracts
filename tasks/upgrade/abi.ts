import { BigNumberish } from "ethers";
import { task } from "hardhat/config";
import { ZERO_ADDRESS } from "../../helpers/constants";
import { getDeploySigner, getPunkGateway, getWETHGateway } from "../../helpers/contracts-getters";
import { getContractAddressInDb } from "../../helpers/contracts-helpers";
import { DRE } from "../../helpers/misc-utils";
import { INftParams } from "../../helpers/types";
import { BittyProxyAdminFactory, LendPoolAddressesProviderFactory, LendPoolConfiguratorFactory, WETHGatewayFactory } from "../../types";
import { NftAssets, NftConfigs } from "../deploy/config";


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


task(`abi:configNfts`, ``)
    .setAction(async ({ }, { run }) => {
        await run("set-DRE");
        await run("compile");
        console.log("0x0000000000000000000000000000000000000000000000000000000000000000");
        const nftAssets = NftAssets[DRE.network.name];
        const nftAddresses: string[] = [nftAssets.DOODLE, nftAssets.MOONBIRD];

        const initParams = nftAddresses.map(v => { return { underlyingAsset: v } })
        let data = LendPoolConfiguratorFactory.connect(
            ZERO_ADDRESS,
            await getDeploySigner()
        ).interface.encodeFunctionData("batchInitNft", [
            initParams
        ]);
        console.log('batchInitNft parms', initParams);
        console.log('batchInitNft data', data);

        let nftConfigs = NftConfigs[DRE.network.name];
        nftConfigs = [nftConfigs.DOODLE, nftConfigs.MOONBIRD];

        const configParams: {
            asset: string;
            baseLTV: BigNumberish;
            liquidationThreshold: BigNumberish;
            liquidationBonus: BigNumberish;
            redeemDuration: BigNumberish;
            auctionDuration: BigNumberish;
            redeemFine: BigNumberish;
            redeemThreshold: BigNumberish;
            minBidFine: BigNumberish;
            maxSupply: BigNumberish;
            maxTokenId: BigNumberish;
        }[] = [];
        for (const [
            assetSymbol,
            {
                baseLTVAsCollateral,
                liquidationBonus,
                liquidationThreshold,
                redeemDuration,
                auctionDuration,
                redeemFine,
                redeemThreshold,
                minBidFine,
                maxSupply,
                maxTokenId,
            },
        ] of Object.entries(nftConfigs) as [string, INftParams][]) {
            const assetAddressIndex = Object.keys(nftAddresses).findIndex((value) => value === assetSymbol);
            const [, tokenAddress] = (Object.entries(nftAddresses) as [string, string][])[assetAddressIndex];
            configParams.push({
                asset: tokenAddress,
                baseLTV: baseLTVAsCollateral,
                liquidationThreshold: liquidationThreshold,
                liquidationBonus: liquidationBonus,
                redeemDuration: redeemDuration,
                auctionDuration: auctionDuration,
                redeemFine: redeemFine,
                redeemThreshold: redeemThreshold,
                minBidFine: minBidFine,
                maxSupply: maxSupply,
                maxTokenId: maxTokenId,
            });
        }

        data = LendPoolConfiguratorFactory.connect(
            ZERO_ADDRESS,
            await getDeploySigner()
        ).interface.encodeFunctionData("batchConfigNft", [
            configParams
        ]);
        console.log("batchConfigNft params", configParams);
        console.log('batchConfigNft data', data);


        const authParams = nftAddresses;
        data = WETHGatewayFactory.connect(ZERO_ADDRESS, await getDeploySigner()).interface.encodeFunctionData("authorizeLendPoolNFT", [authParams])
        console.log("authorizeLendPoolNFT params", authParams);
        console.log('authorizeLendPoolNFT data', data);
    });