import { task } from "hardhat/config";
import { loadPoolConfig, ConfigNames, getWrappedNativeTokenAddress } from "../../helpers/configuration";
import {
  getBittyProtocolDataProvider,
  getLendPoolImpl,
  getLendPoolAddressesProvider,
  getLendPoolLoanImpl,
  getLendPoolConfiguratorImpl,
  getBittyUpgradeableProxy,
  getWalletProvider,
  getWETHGateway,
  getPunkGateway,
  getUIPoolDataProvider,
  getLendPoolAddressesProviderRegistry,
  getBittyCollectorProxy,
  getBittyCollectorImpl,
  getBittyProxyAdminById,
  getReserveOracleImpl,
  getNFTOracle,
  getNFTOracleImpl,
  getWETHGatewayImpl,
  getPunkGatewayImpl,
  getGenericLogic,
  getReserveLogic,
  getSupplyLogic,
  getBorrowLogic,
  getLiquidateLogic,
} from "../../helpers/contracts-getters";
import { verifyContract, getParamPerNetwork, getContractAddressInDb } from "../../helpers/contracts-helpers";
import { verifyEtherscanContract } from "../../helpers/etherscan-verification";
import { notFalsyOrZeroAddress } from "../../helpers/misc-utils";
import { eContractid, eNetwork, ICommonConfiguration } from "../../helpers/types";

task("verify:general", "Verify general contracts at Etherscan")
  .addFlag("all", "Verify all contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ all, pool }, localDRE) => {
    await localDRE.run("set-DRE");
    const network = localDRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);
    const { MarketId, CryptoPunksMarket, WrappedPunkToken } = poolConfig as ICommonConfiguration;

    const bittyCollectorImpl = await getBittyCollectorImpl();

    const providerRegistry = await getLendPoolAddressesProviderRegistry();
    const addressesProvider = await getLendPoolAddressesProvider();

    const lendPoolAddress = await addressesProvider.getLendPool();
    const lendPoolConfiguratorAddress = await addressesProvider.getLendPoolConfigurator();
    const lendPoolLoanAddress = await addressesProvider.getLendPoolLoan();

    const lendPoolProxy = await getBittyUpgradeableProxy(lendPoolAddress);
    const lendPoolConfiguratorProxy = await getBittyUpgradeableProxy(lendPoolConfiguratorAddress);
    const lendPoolLoanProxy = await getBittyUpgradeableProxy(lendPoolLoanAddress);

    const punkAddress = getParamPerNetwork(CryptoPunksMarket, network);
    const wpunkAddress = getParamPerNetwork(WrappedPunkToken, network);

    const wethGateway = await getWETHGateway();
    const punkGateway = await getPunkGateway();

    const lendPoolImpl = await getLendPoolImpl();
    const lendPoolConfiguratorImpl = await getLendPoolConfiguratorImpl();
    const lendPoolLoanImpl = await getLendPoolLoanImpl();

    const reserveOracleImpl = await getReserveOracleImpl();
    const nftOracleImpl = await getNFTOracleImpl();

    const wethGatewayImpl = await getWETHGatewayImpl();
    const punkGatewayImpl = await getPunkGatewayImpl();

    const proxyAdminFund = await getBittyProxyAdminById(eContractid.BittyProxyAdminFund);
    await verifyContract(eContractid.BittyProxyAdminFund, proxyAdminFund, []);

    const proxyAdminPool = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    await verifyContract(eContractid.BittyProxyAdminPool, proxyAdminPool, []);

    const proxyAdminWTL = await getBittyProxyAdminById(eContractid.BittyProxyAdminWTL);
    await verifyContract(eContractid.BittyProxyAdminWTL, proxyAdminWTL, []);

    if (all) {
      const dataProvider = await getBittyProtocolDataProvider();
      const walletProvider = await getWalletProvider();
      const uiProvider = await getUIPoolDataProvider();

      // BittyCollector
      console.log("\n- Verifying Collector...\n");
      await verifyContract(eContractid.BittyCollectorImpl, bittyCollectorImpl, []);

      // Address Provider
      console.log("\n- Verifying provider registry...\n");
      await verifyContract(eContractid.LendPoolAddressesProviderRegistry, providerRegistry, []);

      console.log("\n- Verifying address provider...\n");
      await verifyContract(eContractid.LendPoolAddressesProvider, addressesProvider, [MarketId]);

      // Lend Pool implementation
      console.log("\n- Verifying LendPool Implementation...\n");
      await verifyContract(eContractid.LendPoolImpl, lendPoolImpl, []);

      // Lend Pool Configurator implementation
      console.log("\n- Verifying LendPool Configurator Implementation...\n");
      await verifyContract(eContractid.LendPoolConfiguratorImpl, lendPoolConfiguratorImpl, []);

      // Lend Pool Loan Manager implementation
      console.log("\n- Verifying LendPool Loan Implementation...\n");
      await verifyContract(eContractid.LendPoolLoanImpl, lendPoolLoanImpl, []);

      // Bitty Data Provider
      console.log("\n- Verifying Bitty Data Provider...\n");
      await verifyContract(eContractid.BittyProtocolDataProvider, dataProvider, [addressesProvider.address]);

      // Wallet balance provider
      console.log("\n- Verifying Wallet Balance Provider...\n");
      await verifyContract(eContractid.WalletBalanceProvider, walletProvider, []);

      // UI data provider
      console.log("\n- Verifying UI Data Provider...\n");
      await verifyContract(eContractid.UIPoolDataProvider, uiProvider, [
        await addressesProvider.getReserveOracle(),
        await addressesProvider.getNFTOracle(),
      ]);

      console.log("\n- Verifying ReserveOracle...\n");
      await verifyContract(eContractid.ReserveOracleImpl, reserveOracleImpl, []);

      console.log("\n- Verifying NFTOracle...\n");
      await verifyContract(eContractid.NFTOracleImpl, nftOracleImpl, []);

      // WETHGateway
      console.log("\n- Verifying WETHGateway...\n");
      await verifyContract(eContractid.WETHGatewayImpl, wethGatewayImpl, []);

      // PunkGateway
      console.log("\n- Verifying PunkGateway...\n");
      await verifyContract(eContractid.PunkGatewayImpl, punkGatewayImpl, []);
    }

    // BittyCollector Proxy
    console.log("\n- Verifying Collector...\n");
    const bittyCollectorProxy = await getBittyCollectorProxy();
    const collectorProxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminFund);
    await verifyContract(eContractid.BittyCollector, bittyCollectorProxy, [
      bittyCollectorImpl.address,
      collectorProxyAdmin.address,
      bittyCollectorImpl.interface.encodeFunctionData("initialize"),
    ]);

    // Lend Pool proxy
    console.log("\n- Verifying Lend Pool Proxy...\n");
    await verifyContract(eContractid.BittyUpgradeableProxy, lendPoolProxy, [
      lendPoolImpl.address,
      addressesProvider.address,
      lendPoolImpl.interface.encodeFunctionData("initialize", [addressesProvider.address]),
    ]);

    // LendPool Conf proxy
    console.log("\n- Verifying Lend Pool Configurator Proxy...\n");
    await verifyContract(eContractid.BittyUpgradeableProxy, lendPoolConfiguratorProxy, [
      lendPoolConfiguratorImpl.address,
      addressesProvider.address,
      lendPoolConfiguratorImpl.interface.encodeFunctionData("initialize", [addressesProvider.address]),
    ]);

    // LendPool loan manager
    console.log("\n- Verifying Lend Pool Loan Manager Proxy...\n");
    await verifyContract(eContractid.BittyUpgradeableProxy, lendPoolLoanProxy, [
      lendPoolLoanImpl.address,
      addressesProvider.address,
      lendPoolLoanImpl.interface.encodeFunctionData("initialize", [addressesProvider.address]),
    ]);

    // WETHGateway
    console.log("\n- Verifying WETHGateway Proxy...\n");
    await verifyContract(eContractid.BittyUpgradeableProxy, wethGateway, [
      wethGatewayImpl.address,
      proxyAdminPool.address,
      wethGatewayImpl.interface.encodeFunctionData("initialize", [
        addressesProvider.address,
        await getWrappedNativeTokenAddress(poolConfig),
      ]),
    ]);

    // PunkGateway
    console.log("\n- Verifying PunkGateway Proxy...\n");
    await verifyContract(eContractid.BittyUpgradeableProxy, punkGateway, [
      punkGatewayImpl.address,
      proxyAdminPool.address,
      punkGatewayImpl.interface.encodeFunctionData("initialize", [
        addressesProvider.address,
        wethGateway.address,
        punkAddress,
        wpunkAddress,
      ]),
    ]);

    console.log("Finished verifications.");
  });

task("verify:libraries", "Verify libraries at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ pool }, localDRE) => {
    await localDRE.run("set-DRE");
    const network = localDRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const nftLogicAddress = await getContractAddressInDb(eContractid.NftLogic);
    const validationLogicAddress = await getContractAddressInDb(eContractid.ValidationLogic);

    console.log("\n- Verifying NftLogic...\n");
    await verifyEtherscanContract(nftLogicAddress, []);

    console.log("\n- Verifying ValidationLogic...\n");
    await verifyEtherscanContract(validationLogicAddress, []);

    console.log("\n- Verifying GenericLogic...\n");
    const genLogic = await getGenericLogic();
    await verifyContract(eContractid.GenericLogic, genLogic, []);

    console.log("\n- Verifying ReserveLogic...\n");
    const resLogic = await getReserveLogic();
    await verifyContract(eContractid.ReserveLogic, resLogic, []);

    console.log("\n- Verifying SupplyLogic...\n");
    const supLogic = await getSupplyLogic();
    await verifyContract(eContractid.SupplyLogic, supLogic, []);

    console.log("\n- Verifying BorrowLogic...\n");
    const borLogic = await getBorrowLogic();
    await verifyContract(eContractid.BorrowLogic, borLogic, []);

    console.log("\n- Verifying LiquidateLogic...\n");
    const liqLogic = await getLiquidateLogic();
    await verifyContract(eContractid.LiquidateLogic, liqLogic, []);

    console.log("Finished verifications.");
  });
