import { BytesLike } from "ethers";
import { task } from "hardhat/config";
import { boolean } from "hardhat/internal/core/params/argumentTypes";
import {
  ConfigNames,
  getEmergencyAdmin,
  getWrappedNativeTokenAddress,
  loadPoolConfig
} from "../../helpers/configuration";
import { ADDRESS_ID_PUNK_GATEWAY, ADDRESS_ID_WETH_GATEWAY } from "../../helpers/constants";
import {
  deployBittyProtocolDataProvider,
  deployBittyProxyAdmin,
  deployBorrowLogicLibrary,
  deployConfiguratorLogicLibrary,
  deployGenericBTokenImpl,
  deployGenericDebtToken,
  deployGenericLogic,
  deployLendPool,
  deployLendPoolAddressesProvider,
  deployLendPoolAddressesProviderRegistry,
  deployLendPoolConfigurator,
  deployLendPoolLoan,
  deployLiquidateLogicLibrary,
  deployNFTOracle,
  deployNftLogicLibrary,
  deployPunkGateway,
  deployReserveLogicLibrary,
  deployReserveOracle,
  deploySupplyLogicLibrary,
  deployUiPoolDataProvider,
  deployValidationLogic,
  deployWalletBalancerProvider
} from "../../helpers/contracts-deployments";
import {
  getBittyCollectorImpl,
  getBittyCollectorProxy,
  getBittyProtocolDataProvider,
  getBittyProxyAdminByAddress,
  getBittyProxyAdminById,
  getBittyUpgradeableProxy,
  getBorrowLogic,
  getDeploySigner,
  getGenericLogic,
  getLendPool,
  getLendPoolAddressesProvider,
  getLendPoolAddressesProviderRegistry,
  getLendPoolConfiguratorImpl,
  getLendPoolConfiguratorProxy,
  getLendPoolImpl,
  getLendPoolLoanImpl,
  getLendPoolLoanProxy,
  getLiquidateLogic,
  getNFTOracle,
  getNFTOracleImpl,
  getPunkGateway,
  getReserveLogic,
  getReserveOracle,
  getReserveOracleImpl,
  getSupplyLogic,
  getUIPoolDataProvider,
  getWalletProvider
} from "../../helpers/contracts-getters";
import {
  getContractAddressInDb,
  insertContractAddressInDb,
  registerContractInJsonDb,
  verifyContract,
  withSaveAndVerify
} from "../../helpers/contracts-helpers";
import { verifyEtherscanContract } from "../../helpers/etherscan-verification";
import {
  configureNftsByHelper,
  configureReservesByHelper,
  initNftsByHelper,
  initReservesByHelper,
} from "../../helpers/init-helpers";
import { DRE, getDb, notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { deployChainlinkMockAggregator } from "../../helpers/oracles-helpers";
import { eContractid, tEthereumAddress } from "../../helpers/types";
import {
  BittyCollectorFactory,
  BittyProxyAdmin,
  BittyUpgradeableProxy,
  BittyUpgradeableProxyFactory,
  PunkGateway,
  WETHGatewayFactory,
} from "../../types";
import { BNFTRegistry, IncentivesController, NftAssets, NftConfigs, Punk, ReserveAggregators, ReserveAssets, ReserveConfigs } from "./config";

task("deploy:deploy-all", "Deploy lend pool for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    await run("deploy:deploy-proxy-admin", { verify });
    await run("deploy:deploy-bitty-collector", { verify });
    await run("deploy:deploy-address-provider", { verify });
    await run("deploy:deploy-address-provider-registry", { verify });
    await run("config:config-pool-admin");
    await run("config:config-bnft-registry");
    await run('config:config-incentive')
    await run("deploy:deploy-lend-libraries", { verify });
    await run("deploy:deploy-lend-pool", { verify });
    await run("deploy:deploy-lend-pool-loan", { verify });
    await run("deploy:deploy-lend-pool-config", { verify });
    await run("deploy:deploy-bToken", { verify });
    await run("deploy:deploy-debtToken", { verify });
    await run("deploy:deploy-reserve-oracle", { verify });
    await run("deploy:deploy-nft-oracle", { verify });
    await run("config:config-nft-oracle");
    await run("config:config-reserves", { verify });
    await run('config:add-aggregators');
    await run("config:config-nfts", { init: true });
    await run("deploy:deploy-weth-gateway", { verify });
    await run("config:config-weth-gateway");
    await run("deploy:deploy-punk-gateway", { verify });
    await run('config:punkgateway-authorize-lendpool-erc20-tokens');
    await run("config:wethgateway-authorize-caller-whitelist", { caller: (await getPunkGateway()).address, flag: '1' });
    await run("deploy:deploy-data-provider", { verify, wallet: true, protocol: true, ui: true });
    await run("deploy:update-reserve-tokens");
  });

task("deploy:deploy-proxy-admin", "Deploy proxy admin contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");

    let proxyAdmin: BittyProxyAdmin;

    let proxyAdminAddress = await getDb(DRE.network.name).get(`${eContractid.BittyProxyAdminPool}`).value();
    if (!proxyAdminAddress || !notFalsyOrZeroAddress(proxyAdminAddress.address)) {
      proxyAdmin = await deployBittyProxyAdmin(eContractid.BittyProxyAdminPool, verify);
    } else {
      proxyAdmin = await getBittyProxyAdminByAddress(proxyAdminAddress.address);
    }
    console.log("BittyProxyAdminPool Address:", proxyAdmin.address, "Owner Address:", await proxyAdmin.owner());
  });

task("deploy:deploy-bitty-collector", "Deploy bitty collect contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");

    const collectorProxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    const proxyAdminOwner = await collectorProxyAdmin.owner();
    console.log("Proxy Admin: address %s, owner %s", collectorProxyAdmin.address, proxyAdminOwner);

    const bittyCollectorImpl = await new BittyCollectorFactory(await getDeploySigner()).deploy();
    await bittyCollectorImpl.deployed();

    const initEncodedData = bittyCollectorImpl.interface.encodeFunctionData("initialize");

    const bittyCollectorProxy = await deployBittyUpgradeableProxy(
      "BittyCollector",
      collectorProxyAdmin.address,
      bittyCollectorImpl.address,
      initEncodedData,
      verify
    );
    console.log("Bitty Collector: proxy %s, implementation %s", bittyCollectorProxy.address, bittyCollectorImpl.address);
  });

task("deploy:deploy-address-provider", "Deploy address provider for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const poolConfig = loadPoolConfig(ConfigNames.Bitty);
    await deployLendPoolAddressesProvider(poolConfig.MarketId, verify);
  });

task("config:config-pool-admin", "Deploy address provider for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const addressesProvider = await getLendPoolAddressesProvider();
    const signer = await getDeploySigner();
    const admin = await signer.getAddress();

    await waitForTx(await addressesProvider.setPoolAdmin(admin));
    await waitForTx(await addressesProvider.setEmergencyAdmin(admin));

    console.log("Pool Admin", await addressesProvider.getPoolAdmin());
    console.log("Emergency Admin", await addressesProvider.getEmergencyAdmin());
  });

task("deploy:deploy-address-provider-registry", "Deploy address provider registry")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const poolConfig = loadPoolConfig(ConfigNames.Bitty);
    const contract = await deployLendPoolAddressesProviderRegistry(verify);
    console.log("Deployed Registry Address:", contract.address, "Owner Address:", await contract.owner());
    const addressesProvider = await getLendPoolAddressesProvider();
    await waitForTx(await contract.registerAddressesProvider(addressesProvider.address, poolConfig.ProviderId));
  });

export const deployBittyUpgradeableProxy = async (
  id: string,
  admin: tEthereumAddress,
  logic: tEthereumAddress,
  data: BytesLike,
  verify?: boolean
) => {
  const instance = await new BittyUpgradeableProxyFactory(await getDeploySigner()).deploy(logic, admin, data);
  await instance.deployed();
  await registerContractInJsonDb(id, instance);
  if (verify) {
    await verifyEtherscanContract(instance.address, [logic, admin, DRE.ethers.utils.hexlify(data)]);
  }
  return instance;
};

task("config:config-incentive", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  await run("compile");
  const addressesProvider = await getLendPoolAddressesProvider();
  const incentivesControllerAddress = IncentivesController[DRE.network.name];
  if (incentivesControllerAddress != undefined || notFalsyOrZeroAddress(incentivesControllerAddress)) {
    console.log("Setting IncentivesController to address provider...");
    await addressesProvider.setIncentivesController(incentivesControllerAddress);
  }
});

task("config:config-bnft-registry", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  await run("compile");

  const addressesProvider = await getLendPoolAddressesProvider();
  const bnftRegistryAddress = BNFTRegistry[DRE.network.name];
  if (bnftRegistryAddress == undefined || !notFalsyOrZeroAddress(bnftRegistryAddress)) {
    throw Error("Invalid BNFT Registry address in pool config");
  }
  console.log("Setting BNFTRegistry to address provider...");
  await waitForTx(await addressesProvider.setBNFTRegistry(bnftRegistryAddress));
});

task("deploy:deploy-lend-libraries", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const reserveLogic = await deployReserveLogicLibrary(verify);
    const genericLogic = await deployGenericLogic(verify);
    await deployNftLogicLibrary(verify);
    await deployValidationLogic(reserveLogic, genericLogic, verify);

    await deploySupplyLogicLibrary(verify);
    await deployBorrowLogicLibrary(verify);
    await deployLiquidateLogicLibrary(verify);
    await deployConfiguratorLogicLibrary(verify);
  });

task("deploy:deploy-lend-pool", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const addressesProvider = await getLendPoolAddressesProvider();
    console.log("Deploying new lend pool implementation");
    let lendPoolImpl = await deployLendPool(verify);
    console.log("Setting lend pool implementation with address:", lendPoolImpl.address);
    // Set lending pool impl to Address provider
    await waitForTx(await addressesProvider.setLendPoolImpl(lendPoolImpl.address, []));
    const address = await addressesProvider.getLendPool();
    const lendPoolProxy = (await getLendPool(address)).address;
    await insertContractAddressInDb(eContractid.LendPool, lendPoolProxy);
  });

task("deploy:deploy-lend-pool-loan", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const addressesProvider = await getLendPoolAddressesProvider();
    console.log("Deploying new loan implementation...");
    const lendPoolLoanImpl = await deployLendPoolLoan(verify);
    console.log("Setting lend pool loan implementation with address:", lendPoolLoanImpl.address);
    // Set lend pool conf impl to Address Provider
    await waitForTx(await addressesProvider.setLendPoolLoanImpl(lendPoolLoanImpl.address, []));
    const lendPoolLoanProxy = (await getLendPoolLoanProxy(await addressesProvider.getLendPoolLoan())).address;
    await insertContractAddressInDb(eContractid.LendPoolLoan, lendPoolLoanProxy);
  });

task("deploy:deploy-lend-pool-config", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const addressesProvider = await getLendPoolAddressesProvider();
    console.log("Deploying new configurator implementation...");
    const lendPoolConfiguratorImpl = await deployLendPoolConfigurator(verify);
    console.log("Setting lend pool configurator implementation with address:", lendPoolConfiguratorImpl.address);
    // Set lend pool conf impl to Address Provider
    await waitForTx(await addressesProvider.setLendPoolConfiguratorImpl(lendPoolConfiguratorImpl.address, []));
    const lendPoolConfiguratorProxy = (
      await getLendPoolConfiguratorProxy(await addressesProvider.getLendPoolConfigurator())
    ).address;
    await insertContractAddressInDb(eContractid.LendPoolConfigurator, lendPoolConfiguratorProxy);
  });

task("config:pause-lend-pool", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  await run("compile");
  const addressesProvider = await getLendPoolAddressesProvider();
  const lendPoolConfiguratorProxyContract = await getLendPoolConfiguratorProxy(
    await addressesProvider.getLendPoolConfigurator()
  );
  const poolConfig = loadPoolConfig(ConfigNames.Bitty);
  const admin = await DRE.ethers.getSigner(await getEmergencyAdmin(poolConfig));
  // Pause market during deployment
  await waitForTx(await lendPoolConfiguratorProxyContract.connect(admin).setPoolPause(true));
});

task("deploy:deploy-bToken", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    await deployGenericBTokenImpl(verify);
  });

task("deploy:deploy-debtToken", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    await deployGenericDebtToken(verify);
  });

task("deploy:deploy-reserve-oracle", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");

    const proxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);

    const weth = ReserveAssets[DRE.network.name].WETH;

    const reserveOracleImpl = await deployReserveOracle([], verify);
    const initEncodedData = reserveOracleImpl.interface.encodeFunctionData("initialize", [weth]);

    let reserveOracleProxy: BittyUpgradeableProxy;

    console.log("Deploying new reserve oracle proxy & implementation...");

    reserveOracleProxy = await deployBittyUpgradeableProxy(
      eContractid.ReserveOracle,
      proxyAdmin.address,
      reserveOracleImpl.address,
      initEncodedData,
      verify
    );

    console.log("Reserve Oracle: proxy %s, implementation %s", reserveOracleProxy.address, reserveOracleImpl.address);

    const addressesProvider = await getLendPoolAddressesProvider();
    // config reserve oracle
    await waitForTx(await addressesProvider.setReserveOracle(reserveOracleProxy.address));
  });

task("config:config-nft-oracle", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  await run("compile");

  const nftOracle = await getNFTOracle();
  const oracleOwnerAddress = await nftOracle.owner();
  const oracleOwnerSigner = DRE.ethers.provider.getSigner(oracleOwnerAddress);

  // nft oracle set assets
  const nftsAssets = NftAssets[DRE.network.name];
  const tokens = Object.entries(nftsAssets).map(([, tokenAddress]) => {
    return tokenAddress;
  }) as string[];
  await waitForTx(await nftOracle.connect(oracleOwnerSigner).setAssets(tokens));

});

task("deploy:deploy-nft-oracle", "Deploy nft oracle for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addOptionalParam("feedAdmin", "Address of price feed")
  .setAction(async ({ verify, feedAdmin }, { run }) => {
    await run("set-DRE");
    await run("compile");

    if (feedAdmin == undefined || !notFalsyOrZeroAddress(feedAdmin)) {
      feedAdmin = await getDeploySigner();
    }

    const proxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    if (proxyAdmin == undefined || !notFalsyOrZeroAddress(proxyAdmin.address)) {
      throw Error("Invalid pool proxy admin in config");
    }

    const nftOracleImpl = await deployNFTOracle(verify);
    const initEncodedData = nftOracleImpl.interface.encodeFunctionData("initialize", [
      await feedAdmin.getAddress(),
    ]);

    let nftOracleProxy: BittyUpgradeableProxy;
    console.log("Deploying new nft oracle proxy & implementation...");

    nftOracleProxy = await deployBittyUpgradeableProxy(
      eContractid.NFTOracle,
      proxyAdmin.address,
      nftOracleImpl.address,
      initEncodedData,
      verify
    );

    const addressesProvider = await getLendPoolAddressesProvider();

    await waitForTx(await addressesProvider.setNFTOracle(nftOracleProxy.address));

    console.log("NFT Oracle: proxy %s, implementation %s", nftOracleProxy.address, nftOracleImpl.address);
  });


task("config:config-reserves", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { network, run }) => {
    await run("set-DRE");
    const pool = ConfigNames.Bitty;
    const poolConfig = loadPoolConfig(pool);

    const collectorAddress = await getBittyCollectorProxy();

    console.log("Init & Config Reserve assets");

    const reserveAssets = ReserveAssets[network.name];
    const reservesConfig = ReserveConfigs[network.name];

    await initReservesByHelper(
      reservesConfig,
      reserveAssets,
      poolConfig.BTokenNamePrefix,
      poolConfig.BTokenSymbolPrefix,
      poolConfig.DebtTokenNamePrefix,
      poolConfig.DebtTokenSymbolPrefix,
      collectorAddress.address,
      pool,
      verify
    );
    await configureReservesByHelper(reservesConfig, reserveAssets);
  });

task("config:config-nfts", "")
  .addOptionalParam<boolean>("init", "Initialize nfts", false, boolean)
  .setAction(async ({ init }, { run }) => {
    await run("set-DRE");
    console.log("Init & Config NFT assets");
    const nftsAssets = NftAssets[DRE.network.name];
    if (!nftsAssets) {
      throw "NFT assets is undefined. Check NftsAssets configuration at config directory";
    }

    const nftsConfig = NftConfigs[DRE.network.name];
    if (init) {
      await initNftsByHelper(nftsConfig, nftsAssets);
    }
    await configureNftsByHelper(nftsConfig, nftsAssets);
  });

export const deployWETHGateway = async (verify?: boolean) => {
  const wethImpl = await new WETHGatewayFactory(await getDeploySigner()).deploy();
  return await withSaveAndVerify(wethImpl, "WETHGatewayImpl", [], verify);
};

task(`deploy:deploy-weth-gateway`, ``)
  .addFlag("verify", `Verify contract via Etherscan API.`)
  .setAction(async ({ verify }, { network, run }) => {
    await run("set-DRE");
    await run("compile");
    if (!network.config.chainId) {
      throw new Error("INVALID_CHAIN_ID");
    }
    const addressesProvider = await getLendPoolAddressesProvider();

    const proxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    if (proxyAdmin == undefined || !notFalsyOrZeroAddress(proxyAdmin.address)) {
      throw Error("Invalid pool proxy admin in config");
    }
    const weth = ReserveAssets[DRE.network.name].WETH;
    console.log("WETH address", weth);

    const wethGatewayImpl = await deployWETHGateway(verify);
    const initEncodedData = wethGatewayImpl.interface.encodeFunctionData("initialize", [
      addressesProvider.address,
      weth,
    ]);

    console.log("Deploying new WETHGateway proxy & implementation...");
    const wethGatewayProxy = await deployBittyUpgradeableProxy(
      "WETHGateway",
      proxyAdmin.address,
      wethGatewayImpl.address,
      initEncodedData,
      verify
    );

    console.log("WETHGateway: proxy %s, implementation %s", wethGatewayProxy.address, wethGatewayImpl.address);
    console.log("Finished WETHGateway deployment");
    const wethGateway = await getWETHGateway();
    await waitForTx(await addressesProvider.setAddress(ADDRESS_ID_WETH_GATEWAY, wethGateway.address));
  });



task(`config:config-weth-gateway`, ``)
  .addFlag("verify", `Verify contract via Etherscan API.`)
  .setAction(async ({ }, { network, run }) => {
    await run("set-DRE");
    await run("compile");
    if (!network.config.chainId) {
      throw new Error("INVALID_CHAIN_ID");
    }
    const nftsAssets = NftAssets[DRE.network.name];
    const wethGateway = await getWETHGateway();
    let nftAddresses: string[] = [];
    for (const [, assetAddress] of Object.entries(nftsAssets) as [string, string][]) {
      nftAddresses.push(assetAddress);
    }
    console.log("WETHGateway: authorizeLendPoolNFT:", nftAddresses);
    await waitForTx(await wethGateway.authorizeLendPoolNFT(nftAddresses));
  });

export const getWETHGateway = async (address?: tEthereumAddress) =>
  WETHGatewayFactory.connect(
    address || (await getDb(DRE.network.name).get("WETHGateway").value()).address,
    await getDeploySigner()
  );

task("deploy:deploy-data-provider", "Deploy data provider for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addFlag("wallet", "Deploy wallet balancer provider")
  .addFlag("protocol", "Deploy bitty protocol data provider")
  .addFlag("ui", "Deploy ui data provider")
  .setAction(async ({ verify, wallet, protocol, ui }, { run }) => {
    await run("set-DRE");
    await run("compile");

    const addressesProvider = await getLendPoolAddressesProvider();

    // this contract is not support upgrade, just deploy new contract
    const reserveOracle = await addressesProvider.getReserveOracle();
    const nftOracle = await addressesProvider.getNFTOracle();

    if (wallet) {
      const walletBalanceProvider = await deployWalletBalancerProvider(verify);
      console.log("WalletBalancerProvider deployed at:", walletBalanceProvider.address);
      await addressesProvider.setWalletBalanceProvider(walletBalanceProvider.address);
    }

    // this contract is not support upgrade, just deploy new contract
    if (protocol) {
      const bittyProtocolDataProvider = await deployBittyProtocolDataProvider(addressesProvider.address, verify);
      console.log("BittyProtocolDataProvider deployed at:", bittyProtocolDataProvider.address);
      await addressesProvider.setBittyDataProvider(bittyProtocolDataProvider.address);
    }

    // this contract is not support upgrade, just deploy new contract
    if (ui) {
      const uiPoolDataProvider = await deployUiPoolDataProvider(reserveOracle, nftOracle, verify);
      console.log("UiPoolDataProvider deployed at:", uiPoolDataProvider.address);
      await addressesProvider.setUIDataProvider(uiPoolDataProvider.address);
    }
  });

task("deploy:update-reserve-tokens", "Update reserve tokens")
  .setAction(async ({ }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const bittyProtocolDataProvider = await getBittyProtocolDataProvider();
    const reserveTokens = await bittyProtocolDataProvider.getAllReservesTokenDatas();
    reserveTokens.forEach(async (token) => {
      insertContractAddressInDb(token[0] as eContractid, token[1]);
      insertContractAddressInDb(token[2] as eContractid, token[3]);
      insertContractAddressInDb(token[4] as eContractid, token[5]);
    });
  });

task("verify:All", "verify contract").setAction(async (_, { run }) => {
  await run("set-DRE");
  const poolConfig = loadPoolConfig(ConfigNames.Bitty);
  const bittyCollectorImpl = await getBittyCollectorImpl();
  const providerRegistry = await getLendPoolAddressesProviderRegistry();
  const addressesProvider = await getLendPoolAddressesProvider();
  const lendPoolImpl = await getLendPoolImpl();
  const lendPoolConfiguratorImpl = await getLendPoolConfiguratorImpl();
  const lendPoolLoanImpl = await getLendPoolLoanImpl();

  const reserveOracleImpl = await getReserveOracleImpl();
  const nftOracleImpl = await getNFTOracleImpl();
  const dataProvider = await getBittyProtocolDataProvider();
  const walletProvider = await getWalletProvider();
  const uiProvider = await getUIPoolDataProvider();

  // const proxyAdminFund = await getBittyProxyAdminById(eContractid.BittyProxyAdminFund)
  // await verifyContract(eContractid.BittyProxyAdminFund, proxyAdminFund, [])

  const proxyAdminPool = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
  await verifyContract(eContractid.BittyProxyAdminPool, proxyAdminPool, []);

  // const proxyAdminWTL = await getBittyProxyAdminById(eContractid.BittyProxyAdminWTL)
  // await verifyContract(eContractid.BittyProxyAdminWTL, proxyAdminWTL, [])

  // BittyCollector
  console.log("\n- Verifying Collector...\n");
  await verifyContract(eContractid.BittyCollectorImpl, bittyCollectorImpl, []);

  // Address Provider
  console.log("\n- Verifying provider registry...\n");
  await verifyContract(eContractid.LendPoolAddressesProviderRegistry, providerRegistry, []);

  console.log("\n- Verifying address provider...\n");
  await verifyContract(eContractid.LendPoolAddressesProvider, addressesProvider, [poolConfig.MarketId]);

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
  await verifyContract("WETHGatewayImpl", await getWETHGatewayImpl(), []);

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

  console.log("\n- Verifying Collector...\n");
  const bittyCollectorProxy = await getBittyCollectorProxy();
  const collectorProxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
  await verifyContract(eContractid.BittyCollector, bittyCollectorProxy, [
    bittyCollectorImpl.address,
    collectorProxyAdmin.address,
    bittyCollectorImpl.interface.encodeFunctionData("initialize"),
  ]);
  const lendPoolAddress = await addressesProvider.getLendPool();
  const lendPoolConfiguratorAddress = await addressesProvider.getLendPoolConfigurator();
  const lendPoolLoanAddress = await addressesProvider.getLendPoolLoan();
  const lendPoolProxy = await getBittyUpgradeableProxy(lendPoolAddress);
  const lendPoolConfiguratorProxy = await getBittyUpgradeableProxy(lendPoolConfiguratorAddress);
  const lendPoolLoanProxy = await getBittyUpgradeableProxy(lendPoolLoanAddress);
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
  const wethGateway = await getWETHGateway();
  const wethGatewayImpl = await getWETHGatewayImpl();
  await verifyContract(eContractid.BittyUpgradeableProxy, wethGateway, [
    wethGatewayImpl.address,
    proxyAdminPool.address,
    wethGatewayImpl.interface.encodeFunctionData("initialize", [
      addressesProvider.address,
      await getWrappedNativeTokenAddress(poolConfig),
    ]),
  ]);
});

export const getWETHGatewayImpl = async (address?: tEthereumAddress) =>
  WETHGatewayFactory.connect(
    address || (await getDb(DRE.network.name).get("WETHGatewayImpl").value()).address,
    await getDeploySigner()
  );

task("verify:Contract", "verify contract")
  .addParam("address", "The contract address")
  .addOptionalParam("contract", "The contract file path")
  .addOptionalParam("args", "The contract constructor args")
  .setAction(async ({ address, args, contract }, { run }) => {
    await run("set-DRE");
    await run("compile");
    if (args) {
      args = (args as string).split(",");
    } else {
      args = [];
    }

    await verifyEtherscanContract(address, args, contract);
  });


task("config:config-feed-admin", "")
  .addParam("address", "The feed admin address")
  .setAction(async ({ address }, { run }) => {
    await run("set-DRE");
    const nftOracle = await getNFTOracle();
    await nftOracle.setPriceFeedAdmin(address);
  });

task(`deploy:deploy-punk-gateway`, `Deploys the PunkGateway contract`)
  .addFlag("verify", `Verify contract via Etherscan API.`)
  .setAction(async ({ verify }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");

    if (!DRE.network.config.chainId) {
      throw new Error("INVALID_CHAIN_ID");
    }

    const addressesProvider = await getLendPoolAddressesProvider();

    const proxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    if (proxyAdmin == undefined || !notFalsyOrZeroAddress(proxyAdmin.address)) {
      throw Error("Invalid pool proxy admin in config");
    }

    const wethGateWay = await getWETHGateway();
    console.log("wethGateWay.address", wethGateWay.address);

    const punk = Punk[DRE.network.name];
    console.log("CryptoPunksMarket.address", punk);

    const wpunk = NftAssets[DRE.network.name].WPUNKS;
    console.log("WPUNKS.address", wpunk);

    // this contract is not support upgrade, just deploy new contract
    const punkGateWayImpl = await deployPunkGateway(verify);
    const initEncodedData = punkGateWayImpl.interface.encodeFunctionData("initialize", [
      addressesProvider.address,
      wethGateWay.address,
      punk,
      wpunk,
    ]);

    let punkGateWay: PunkGateway;
    console.log("Deploying new PunkGateway proxy & implementation...");
    const punkGatewayProxy = await deployBittyUpgradeableProxy(
      eContractid.PunkGateway,
      proxyAdmin.address,
      punkGateWayImpl.address,
      initEncodedData,
      verify
    );
    punkGateWay = await getPunkGateway(punkGatewayProxy.address);
    await waitForTx(await addressesProvider.setAddress(ADDRESS_ID_PUNK_GATEWAY, punkGateWay.address));
    console.log("PunkGateway: proxy %s, implementation %s", punkGateWay.address, punkGateWayImpl.address);
    console.log("Finished PunkGateway deployment");

  });


task("config:punkgateway-authorize-lendpool-erc20", "")
  .addVariadicPositionalParam("tokens", "Address of tokens")
  .setAction(async ({ tokens }, localBRE) => {
    await localBRE.run("set-DRE");
    const punkGateway = await getPunkGateway();
    console.log("PunkGateway: %s auth tokens %s", punkGateway.address, tokens);
    await waitForTx(await punkGateway.authorizeLendPoolERC20(tokens));
  });


task("config:punkgateway-authorize-lendpool-erc20-tokens", "Authorize tokens to lend pool")
  .setAction(async (_, { run }) => {
    await run("set-DRE");
    const punkGateway = await getPunkGateway();
    const tokens = Object.values(ReserveAssets[DRE.network.name]) as string[];
    console.log("PunkGateway: %s auth tokens %s", punkGateway.address, tokens);
    await waitForTx(await punkGateway.authorizeLendPoolERC20(tokens));
  });

task("config:punkgateway-authorize-caller-whitelist", "Initialize gateway configuration.")
  .addParam("caller", "Address of whitelist")
  .addParam("flag", "Flag of whitelist, 0-1")
  .setAction(async ({ caller, flag }, localBRE) => {
    await localBRE.run("set-DRE");
    const punkGateway = await getPunkGateway();
    console.log("PunkGateway: %s auth caller %s", punkGateway.address, caller);
    await waitForTx(await punkGateway.authorizeCallerWhitelist([caller], flag));
  });


task("config:wethgateway-authorize-caller-whitelist", "Initialize gateway configuration.")
  .addParam("caller", "Address of whitelist")
  .addParam("flag", "Flag of whitelist, 0-1")
  .setAction(async ({ caller, flag }, localBRE) => {
    await localBRE.run("set-DRE");
    const wethGateway = await getWETHGateway();
    console.log("WETHGateway: %s auth caller %s", wethGateway.address, caller);
    await waitForTx(await wethGateway.authorizeCallerWhitelist([caller], flag));
  });

task("deploy:deploy-mock-aggregator", "Deploy one mock aggregator for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("decimals", "token decimals")
  .addParam("price", "init price")
  .setAction(async ({ verify, decimals, price }, localBRE) => {
    await localBRE.run("set-DRE");
    const mockAgg = await deployChainlinkMockAggregator("USDT/ETH", decimals, price, verify);

    console.log("Aggregator address:", mockAgg.address);
  });


task("config:add-aggregator", "Add aggregator to reserve")
  .addParam("reserveName", "reserve name")
  .addParam("reserveAddress", "reserve address")
  .addParam("aggregator", "aggregator address")
  .setAction(async ({ reserveName, reserveAddress, aggregator }, DRE) => {
    await DRE.run("set-DRE");
    const addressesProvider = await getLendPoolAddressesProvider();
    const oracle = await getReserveOracle(await addressesProvider.getReserveOracle());
    const owwnerAddress = await oracle.owner();
    const ownerSigner = DRE.ethers.provider.getSigner(owwnerAddress);
    await waitForTx(await oracle.connect(ownerSigner).addAggregator(reserveAddress, aggregator));
    await insertContractAddressInDb(`${reserveName}Aggregator` as eContractid, aggregator);
    const price = await oracle.getAssetPrice(reserveAddress);
    console.log("reserveName", reserveName, "reserveAddress", reserveAddress, "aggregator", aggregator, "price", price.toString());
  });


task("config:add-aggregators", "Add aggregators to reserve")
  .setAction(async (_, { run }) => {
    await run("set-DRE");
    const reserveAssets = ReserveAssets[DRE.network.name];
    const reserveAggregators = ReserveAggregators[DRE.network.name];
    for (const [reserveName, reserveAddress] of Object.entries(reserveAssets)) {
      const aggregator = reserveAggregators[reserveName];
      if (aggregator) {
        await run("config:add-aggregator", { reserveName: reserveName, reserveAddress: reserveAddress, aggregator: aggregator });
      }
    }
  });


task("config:proxyAdmin:transferOwnership", "Transfer ownership of proxy admin to new address")
  .addParam("newOwner", "New owner address")
  .setAction(async ({ newOwner }, DRE) => {
    await DRE.run("set-DRE");
    let proxyAdminAddress = await getDb(DRE.network.name).get(`${eContractid.BittyProxyAdminPool}`).value();
    const proxyAdmin = await getBittyProxyAdminByAddress(proxyAdminAddress.address);
    await waitForTx(await proxyAdmin.transferOwnership(newOwner));
    console.log("ProxyAdmin ownership transferred to", newOwner);
  });

task("config:set-emergencyAdmin", "Set emergency admin address")
  .addParam("emergencyAdmin", "Emergency admin address")
  .setAction(async ({ emergencyAdmin }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");
    const addressesProvider = await getLendPoolAddressesProvider();
    await addressesProvider.setEmergencyAdmin(emergencyAdmin);
    console.log("Emergency admin set to", emergencyAdmin);
  });


task("config:set-multisig", "Set multisig address")
  .addParam("multisig", "Multisig address")
  .setAction(async ({ multisig }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");
    console.log("multisig", multisig);
    const collector = await getBittyCollectorProxy();
    await collector.transferOwnership(multisig);
    console.log("collector transfer ownership to", multisig);
    const addressesProvider = await getLendPoolAddressesProvider();
    await addressesProvider.setEmergencyAdmin(multisig);
    console.log("addressesProvider set emergency admin to", multisig);
  });


task("config:set-timelock", "Set timelock address")
  .addParam("timelock", "Timelock address")
  .setAction(async ({ timelock }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");
    console.log("timelock", timelock);
    const addressesProvider = await getLendPoolAddressesProvider();
    await addressesProvider.setPoolAdmin(timelock);
    console.log("addressesProvider set pool admin to", timelock);
    await addressesProvider.transferOwnership(timelock);
    console.log("addressesProvider transfer ownership to", timelock);
    const LendPoolAddressesProviderRegistry = await getLendPoolAddressesProviderRegistry();
    await LendPoolAddressesProviderRegistry.transferOwnership(timelock);
    console.log("LendPoolAddressesProviderRegistry transfer ownership to", timelock);
    const reserveOracle = await getReserveOracle();
    await reserveOracle.transferOwnership(timelock);
    console.log("reserveOracle transfer ownership to", timelock);
    const nftOracle = await getNFTOracle();
    await nftOracle.transferOwnership(timelock);
    console.log("nftOracle transfer ownership to", timelock);
    const wethGateway = await getWETHGateway();
    await wethGateway.transferOwnership(timelock);
    console.log("wethGateway transfer ownership to", timelock);
    const punkGateway = await getPunkGateway();
    await punkGateway.transferOwnership(timelock);
    console.log("punkGateway transfer ownership to", timelock);
  });
