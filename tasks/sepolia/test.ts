import { task } from "hardhat/config";
import { getDeploySigner, getLendPool } from "../../helpers/contracts-getters";
import { constants } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { DRE, waitForTx } from "../../helpers/misc-utils";
import { IERC721TokenWrappedFactory } from "../../types/IERC721TokenWrappedFactory";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { MulticallFactory, WETH9Factory } from "../../types";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { getWBTCGateway } from "./deploy";
import { verifyEtherscanContract } from "../../helpers/etherscan-verification";

export const getWrappedNativeToken = async () =>
  WETH9Factory.connect(
    getParamPerNetwork(loadPoolConfig(ConfigNames.Bitty).WrappedNativeToken, DRE.network.name),
    await getDeploySigner()
  );

task("sepolia:auth_weth", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  const weth = await getWrappedNativeToken();
  const lendPool = await getLendPool();
  await waitForTx(await weth.approve(lendPool.address, constants.MaxUint256));
});

task("sepolia:mint_weth", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  const weth = await getWrappedNativeToken();
  await waitForTx(await weth.freeMint(parseUnits("100", 18)));
});

task("sepolia:mint_nft", "")
  .addParam("address", "address of nft")
  .addParam("id", "id of nft")
  .setAction(async ({ address, id }, { run }) => {
    await run("set-DRE");
    const sender = await getDeploySigner();
    const nft = IERC721TokenWrappedFactory.connect(address, await getDeploySigner());
    await waitForTx(await nft.mint(await sender.getAddress(), id, id));
  });

task("sepolia:auth_nft", "")
  .addParam("address", "address of nft")
  .setAction(async ({ address }, { run }) => {
    await run("set-DRE");
    const nft = IERC721TokenWrappedFactory.connect(address, await getDeploySigner());
    const lendPool = await getLendPool();
    await waitForTx(await nft.setApprovalForAll(lendPool.address, true));
  });


task("sepolia:set_price", "")
  .addParam("address", "address of nft")
  .addParam("id", "id of nft")
  .addParam("amount", "borrow amount")
  .setAction(async ({ address, id, amount }, { run }) => {
    await run("set-DRE");
    const wbtc = await getWrappedNativeToken();
    const lendPool = await getLendPool();
    const sender = await getDeploySigner();
    await waitForTx(
      await lendPool.borrow(wbtc.address, parseUnits(amount, 18), address, id, await sender.getAddress(), 0)
    );
  });

task("sepolia:borrow", "")
  .addParam("address", "address of nft")
  .addParam("id", "id of nft")
  .addParam("amount", "borrow amount")
  .setAction(async ({ address, id, amount }, { run }) => {
    await run("set-DRE");
    const wbtc = await getWrappedNativeToken();
    const lendPool = await getLendPool();
    const sender = await getDeploySigner();
    await waitForTx(
      await lendPool.borrow(wbtc.address, parseUnits(amount, 18), address, id, await sender.getAddress(), 0)
    );
  });

task("sepolia:deposit", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  const lendPool = await getLendPool();
  const wbtc = await getWrappedNativeToken();
  const sender = await getDeploySigner();
  await waitForTx(await lendPool.deposit(wbtc.address, parseUnits("5", 18), await sender.getAddress(), 0));
});

task("sepolia:depositWBTCGateway", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  const wbtcGateway = await getWBTCGateway();
  const sender = await getDeploySigner();
  await waitForTx(await wbtcGateway.depositETH(await sender.getAddress(), 0, { value: parseUnits("5", 16) }));
});

task("sepolia:mockMulticall", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  const multicall = await new MulticallFactory(await getDeploySigner()).deploy();
  await multicall.deployed();
  await verifyEtherscanContract(multicall.address, []);
});
