import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { deployBittyProxyAdmin } from "../../helpers/contracts-deployments";
import { getBittyProxyAdminByAddress } from "../../helpers/contracts-getters";
import { getParamPerNetwork, insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eNetwork, eContractid } from "../../helpers/types";
import { BittyProxyAdmin } from "../../types";

task("full:deploy-proxy-admin", "Deploy proxy admin contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addFlag("all", "Create all proxy admin")
  .addParam("proxyadminid", "Proxy admin ID")
  .setAction(async ({ verify, pool, all, proxyadminid }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");

    const poolConfig = loadPoolConfig(pool);
    const network = <eNetwork>DRE.network.name;

    if (all || proxyadminid == eContractid.BittyProxyAdminPool) {
      let proxyAdmin: BittyProxyAdmin;
      const proxyAdminAddress = getParamPerNetwork(poolConfig.ProxyAdminPool, network);
      if (proxyAdminAddress == undefined || !notFalsyOrZeroAddress(proxyAdminAddress)) {
        proxyAdmin = await deployBittyProxyAdmin(eContractid.BittyProxyAdminPool, verify);
      } else {
        await insertContractAddressInDb(eContractid.BittyProxyAdminPool, proxyAdminAddress);
        proxyAdmin = await getBittyProxyAdminByAddress(proxyAdminAddress);
      }
      console.log("BittyProxyAdminPool Address:", proxyAdmin.address, "Owner Address:", await proxyAdmin.owner());
    }

    if (all || proxyadminid == eContractid.BittyProxyAdminFund) {
      let proxyAdmin: BittyProxyAdmin;
      const proxyAdminAddress = getParamPerNetwork(poolConfig.ProxyAdminFund, network);
      if (proxyAdminAddress == undefined || !notFalsyOrZeroAddress(proxyAdminAddress)) {
        proxyAdmin = await deployBittyProxyAdmin(eContractid.BittyProxyAdminFund, verify);
      } else {
        await insertContractAddressInDb(eContractid.BittyProxyAdminFund, proxyAdminAddress);
        proxyAdmin = await getBittyProxyAdminByAddress(proxyAdminAddress);
      }
      console.log("BittyProxyAdminFund Address:", proxyAdmin.address, "Owner Address:", await proxyAdmin.owner());
    }

    if (all || proxyadminid == eContractid.BittyProxyAdminWTL) {
      let proxyAdmin: BittyProxyAdmin;
      const proxyAdminAddress = getParamPerNetwork(poolConfig.ProxyAdminWTL, network);
      if (proxyAdminAddress == undefined || !notFalsyOrZeroAddress(proxyAdminAddress)) {
        proxyAdmin = await deployBittyProxyAdmin(eContractid.BittyProxyAdminWTL, verify);
      } else {
        await insertContractAddressInDb(eContractid.BittyProxyAdminWTL, proxyAdminAddress);
        proxyAdmin = await getBittyProxyAdminByAddress(proxyAdminAddress);
      }
      console.log("BittyProxyAdminWTL Address:", proxyAdmin.address, "Owner Address:", await proxyAdmin.owner());
    }
  });
