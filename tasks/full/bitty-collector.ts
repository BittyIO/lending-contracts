import { BigNumber } from "ethers";
import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { MAX_UINT_AMOUNT } from "../../helpers/constants";
import {
  deployBittyCollector,
  deployBittyProxyAdmin,
  deployBittyUpgradeableProxy,
} from "../../helpers/contracts-deployments";
import {
  getBittyCollectorProxy,
  getBittyProxyAdminById,
  getBittyUpgradeableProxy,
  getIErc20Detailed,
} from "../../helpers/contracts-getters";
import {
  convertToCurrencyDecimals,
  getEthersSignerByAddress,
  getParamPerNetwork,
  insertContractAddressInDb,
} from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eNetwork, eContractid } from "../../helpers/types";
import { BittyCollector, BittyUpgradeableProxy } from "../../types";

task("full:deploy-bitty-collector", "Deploy bitty collect contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");

    const poolConfig = loadPoolConfig(pool);
    const network = <eNetwork>DRE.network.name;

    const collectorProxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminFund);
    const proxyAdminOwner = await collectorProxyAdmin.owner();
    console.log("Proxy Admin: address %s, owner %s", collectorProxyAdmin.address, proxyAdminOwner);

    const bittyCollectorImpl = await deployBittyCollector(verify);
    const initEncodedData = bittyCollectorImpl.interface.encodeFunctionData("initialize");

    const bittyCollectorProxy = await deployBittyUpgradeableProxy(
      eContractid.BittyCollector,
      collectorProxyAdmin.address,
      bittyCollectorImpl.address,
      initEncodedData,
      verify
    );
    console.log("Bitty Collector: proxy %s, implementation %s", bittyCollectorProxy.address, bittyCollectorImpl.address);
  });

task("full:upgrade-bitty-collector", "Upgrade bitty collect contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("proxy", "Contract proxy address")
  .addOptionalParam("initFunc", "Name of initialize function")
  .setAction(async ({ verify, pool, proxy, initFunc }, DRE) => {
    await DRE.run("set-DRE");
    const poolConfig = loadPoolConfig(pool);
    const network = <eNetwork>DRE.network.name;

    const collectorProxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminFund);
    const proxyAdminOwnerAddress = await collectorProxyAdmin.owner();
    const proxyAdminOwnerSigner = await getEthersSignerByAddress(proxyAdminOwnerAddress);
    console.log("Proxy Admin: address %s, owner %s", collectorProxyAdmin.address, proxyAdminOwnerAddress);

    const bittyCollectorProxy = await getBittyUpgradeableProxy(proxy);
    console.log("Bitty Collector: proxy %s", bittyCollectorProxy.address);

    const bittyCollector = await getBittyCollectorProxy(bittyCollectorProxy.address);

    const bittyCollectorImpl = await deployBittyCollector(verify);
    console.log("Bitty Collector: new implementation %s", bittyCollectorImpl.address);
    insertContractAddressInDb(eContractid.BittyCollector, bittyCollectorProxy.address);

    if (initFunc != undefined && initFunc != "") {
      const initEncodedData = bittyCollectorImpl.interface.encodeFunctionData(initFunc);

      await waitForTx(
        await collectorProxyAdmin
          .connect(proxyAdminOwnerSigner)
          .upgradeAndCall(bittyCollectorProxy.address, bittyCollectorImpl.address, initEncodedData)
      );
    } else {
      await waitForTx(
        await collectorProxyAdmin
          .connect(proxyAdminOwnerSigner)
          .upgrade(bittyCollectorProxy.address, bittyCollectorImpl.address)
      );
    }

    //await waitForTx(await bittyCollector.initialize_v2());

    console.log("Bitty Collector: upgrade ok");
  });

task("bitty-collector:approve-erc20", "Approve ERC20 token")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("proxy", "Contract proxy address")
  .addParam("token", "ERC20 token address")
  .addParam("to", "Target address, like 0.1")
  .addParam("amount", "Amount to approve")
  .setAction(async ({ verify, pool, proxy, token, to, amount }, DRE) => {
    await DRE.run("set-DRE");
    const poolConfig = loadPoolConfig(pool);
    const network = <eNetwork>DRE.network.name;

    const bittyCollectorProxy = await getBittyUpgradeableProxy(proxy);
    console.log("Bitty Collector: proxy %s", bittyCollectorProxy.address);

    const bittyCollector = await getBittyCollectorProxy(bittyCollectorProxy.address);
    const ownerSigner = await getEthersSignerByAddress(await bittyCollector.owner());

    let amountDecimals = MAX_UINT_AMOUNT;
    if (amount != "-1") {
      amountDecimals = (await convertToCurrencyDecimals(token, amount)).toString();
    }

    await waitForTx(await bittyCollector.connect(ownerSigner).approve(token, to, amountDecimals));

    console.log("Bitty Collector: approve ok");
  });
