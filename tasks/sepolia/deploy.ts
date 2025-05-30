import { BytesLike } from "ethers";
import { task } from "hardhat/config";
import {
  ConfigNames,
  getCryptoPunksMarketAddress,
  getEmergencyAdmin,
  getWrappedNativeTokenAddress,
  getWrappedPunkTokenAddress,
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
  getParamPerNetwork,
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
import { ICommonConfiguration, eContractid, eNetwork, tEthereumAddress } from "../../helpers/types";
import {
  strategyNft_AZUKI,
  strategyNft_BAYC,
  strategyNft_MAYC,
  strategyNft_WPUNKS
} from "../../markets/bitty/nftsConfigs";
import { strategyUSDC, strategyUSDT, strategyWETH } from "../../markets/bitty/reservesConfigs";
import {
  BittyCollectorFactory,
  BittyProxyAdmin,
  BittyUpgradeableProxy,
  BittyUpgradeableProxyFactory,
  PunkGateway,
  WETHGatewayFactory
} from "../../types";

task("sepolia:deploy-proxy-admin", "Deploy proxy admin contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");

    const network = <eNetwork>DRE.network.name;
    let proxyAdmin: BittyProxyAdmin;

    let proxyAdminAddress = await getDb(network).get(`${eContractid.BittyProxyAdminPool}`).value();
    if (!proxyAdminAddress || !notFalsyOrZeroAddress(proxyAdminAddress.address)) {
      proxyAdmin = await deployBittyProxyAdmin(eContractid.BittyProxyAdminPool, verify);
    } else {
      proxyAdmin = await getBittyProxyAdminByAddress(proxyAdminAddress.address);
    }
    console.log("BittyProxyAdminPool Address:", proxyAdmin.address, "Owner Address:", await proxyAdmin.owner());
  });

task("sepolia:deploy-bitty-collector", "Deploy bitty collect contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");

    const collectorProxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    const proxyAdminOwner = await collectorProxyAdmin.owner();
    console.log("Proxy Admin: address %s, owner %s", collectorProxyAdmin.address, proxyAdminOwner);

    const bittyCollectorImpl = await new BittyCollectorFactory(await getDeploySigner()).deploy();
    await bittyCollectorImpl.deployed();
    withSaveAndVerify(bittyCollectorImpl, eContractid.BittyCollectorImpl, [], verify);

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

task("sepolia:deploy-address-provider", "Deploy address provider for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify, network }, { run }) => {
    await run("set-DRE");
    await run("compile");
    const poolConfig = loadPoolConfig(ConfigNames.Bitty);
    await deployLendPoolAddressesProvider(poolConfig.MarketId, verify);
  });

task("sepolia:config-pool-admin", "Deploy address provider for full enviroment")
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

task("sepolia:deploy-address-provider-registry", "Deploy address provider registry")
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

task("sepolia:config-incentive", "").setAction(async ({ }, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const poolConfig = loadPoolConfig(ConfigNames.Bitty);
  const addressesProvider = await getLendPoolAddressesProvider();
  const incentivesControllerAddress = getParamPerNetwork(poolConfig.IncentivesController, network.name);
  if (incentivesControllerAddress != undefined || notFalsyOrZeroAddress(incentivesControllerAddress)) {
    console.log("Setting IncentivesController to address provider...");
    await waitForTx(await addressesProvider.setIncentivesController(incentivesControllerAddress));
  }
});

task("sepolia:config-bnft-registry", "").setAction(async ({ }, { network, run }) => {
  await run("set-DRE");
  await run("compile");

  const poolConfig = loadPoolConfig(ConfigNames.Bitty);
  const addressesProvider = await getLendPoolAddressesProvider();
  const bnftRegistryAddress = getParamPerNetwork(poolConfig.BNFTRegistry, network.name);
  if (bnftRegistryAddress == undefined || !notFalsyOrZeroAddress(bnftRegistryAddress)) {
    throw Error("Invalid BNFT Registry address in pool config");
  }
  console.log("Setting BNFTRegistry to address provider...");
  await waitForTx(await addressesProvider.setBNFTRegistry(bnftRegistryAddress));
});

task("sepolia:deploy-lend-libraries", "")
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

task("sepolia:deploy-lend-pool", "")
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

task("sepolia:deploy-lend-pool-loan", "")
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

task("sepolia:deploy-lend-pool-config", "")
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

task("sepolia:pause-lend-pool", "").setAction(async ({ }, { run }) => {
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

task("sepolia:deploy-bToken", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    await deployGenericBTokenImpl(verify);
  });

task("sepolia:deploy-debtToken", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    await deployGenericDebtToken(verify);
  });

task("sepolia:deploy-reserve-oracle", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { network, run }) => {
    await run("set-DRE");
    await run("compile");

    const poolConfig = loadPoolConfig(ConfigNames.Bitty);

    const proxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);

    const weth = getParamPerNetwork(poolConfig.WrappedNativeToken, network.name);

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

task("sepolia:config-nft-oracle", "").setAction(async ({ }, { run }) => {
  await run("set-DRE");
  await run("compile");

  const nftOracle = await getNFTOracle();
  const oracleOwnerAddress = await nftOracle.owner();
  const oracleOwnerSigner = DRE.ethers.provider.getSigner(oracleOwnerAddress);

  // nft oracle set assets
  const poolConfig = loadPoolConfig(ConfigNames.Bitty);
  const { NftsAssets } = poolConfig as ICommonConfiguration;
  const nftsAssets = getParamPerNetwork(NftsAssets, <eNetwork>DRE.network.name);
  const tokens = Object.entries(nftsAssets).map(([, tokenAddress]) => {
    return tokenAddress;
  }) as string[];
  await waitForTx(await nftOracle.connect(oracleOwnerSigner).setAssets(tokens));

});

task("sepolia:deploy-nft-oracle", "Deploy nft oracle for full enviroment")
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


task("sepolia:config-reserves", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { network, run }) => {
    await run("set-DRE");
    const pool = ConfigNames.Bitty;
    const poolConfig = loadPoolConfig(pool);

    const addressesProvider = await getLendPoolAddressesProvider();

    const admin = await addressesProvider.getPoolAdmin();

    const collectorAddress = await getBittyCollectorProxy();
    const weth = getParamPerNetwork(poolConfig.WrappedNativeToken, network.name);

    console.log("Init & Config Reserve assets");

    const reserveAssets = { WETH: weth, USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', USDC: '0x00000000100aaaf8cff772a414b18168fa758af9' };
    const reservesConfig = { WETH: strategyWETH, USDT: strategyUSDT, USDC: strategyUSDC };

    await initReservesByHelper(
      reservesConfig,
      reserveAssets,
      poolConfig.BTokenNamePrefix,
      poolConfig.BTokenSymbolPrefix,
      poolConfig.DebtTokenNamePrefix,
      poolConfig.DebtTokenSymbolPrefix,
      admin,
      collectorAddress.address,
      pool,
      verify
    );
    await configureReservesByHelper(reservesConfig, reserveAssets, admin);
  });

task("sepolia:config-nfts", "")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    const network = <eNetwork>DRE.network.name;
    const pool = ConfigNames.Bitty;
    const poolConfig = loadPoolConfig(pool);

    const addressesProvider = await getLendPoolAddressesProvider();

    const admin = await addressesProvider.getPoolAdmin();

    console.log("Init & Config NFT assets");
    const nftsConfig = {
      WPUNKS: strategyNft_WPUNKS,
      BAYC: strategyNft_BAYC,
      MAYC: strategyNft_MAYC,
      AZUKI: strategyNft_AZUKI,
    };
    const nftsAssets = getParamPerNetwork(poolConfig.NftsAssets, network);
    if (!nftsAssets) {
      throw "NFT assets is undefined. Check NftsAssets configuration at config directory";
    }

    await initNftsByHelper(nftsConfig, nftsAssets, admin, pool, verify);
    await configureNftsByHelper(nftsConfig, nftsAssets, admin);
  });

export const deployWETHGateway = async (verify?: boolean) => {
  const wethImpl = await new WETHGatewayFactory(await getDeploySigner()).deploy();
  await insertContractAddressInDb(<eContractid>"WETHGatewayImpl", wethImpl.address);
  return withSaveAndVerify(wethImpl, "WETHGateway", [], verify);
};

task(`sepolia:deploy-weth-gateway`, ``)
  .addFlag("verify", `Verify contract via Etherscan API.`)
  .setAction(async ({ verify }, { network, run }) => {
    await run("set-DRE");
    await run("compile");
    const pool = ConfigNames.Bitty;
    const poolConfig = loadPoolConfig(pool);
    if (!network.config.chainId) {
      throw new Error("INVALID_CHAIN_ID");
    }

    const addressesProvider = await getLendPoolAddressesProvider();

    const proxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    if (proxyAdmin == undefined || !notFalsyOrZeroAddress(proxyAdmin.address)) {
      throw Error("Invalid pool proxy admin in config");
    }
    const weth = getParamPerNetwork(poolConfig.WrappedNativeToken, network.name);
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



task(`sepolia:config-weth-gateway`, ``)
  .addFlag("verify", `Verify contract via Etherscan API.`)
  .setAction(async ({ }, { network, run }) => {
    await run("set-DRE");
    await run("compile");
    const pool = ConfigNames.Bitty;
    const poolConfig = loadPoolConfig(pool);
    if (!network.config.chainId) {
      throw new Error("INVALID_CHAIN_ID");
    }
    const nftsAssets = getParamPerNetwork(poolConfig.NftsAssets, network.name);
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

task("sepolia:deploy-data-provider", "Deploy data provider for full enviroment")
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
      await waitForTx(await addressesProvider.setWalletBalanceProvider(walletBalanceProvider.address));
    }

    // this contract is not support upgrade, just deploy new contract
    if (protocol) {
      const bittyProtocolDataProvider = await deployBittyProtocolDataProvider(addressesProvider.address, verify);
      console.log("BittyProtocolDataProvider deployed at:", bittyProtocolDataProvider.address);
      await waitForTx(await addressesProvider.setBittyDataProvider(bittyProtocolDataProvider.address));
    }

    // this contract is not support upgrade, just deploy new contract
    if (ui) {
      const uiPoolDataProvider = await deployUiPoolDataProvider(reserveOracle, nftOracle, verify);
      console.log("UiPoolDataProvider deployed at:", uiPoolDataProvider.address);
      await waitForTx(await addressesProvider.setUIDataProvider(uiPoolDataProvider.address));
    }
  });

task("sepolia:deploy-all", "Deploy lend pool for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, { run }) => {
    await run("set-DRE");
    await run("compile");
    await run("sepolia:deploy-proxy-admin", { verify });
    await run("sepolia:deploy-bitty-collector", { verify });

    await run("sepolia:deploy-address-provider", { verify });
    await run("sepolia:deploy-address-provider-registry", { verify });

    await run("sepolia:config-pool-admin");
    await run("sepolia:config-bnft-registry");
    await run('sepolia:config-incentive')

    await run("sepolia:deploy-lend-libraries", { verify });
    await run("sepolia:deploy-lend-pool", { verify });
    await run("sepolia:deploy-lend-pool-loan", { verify });
    await run("sepolia:deploy-lend-pool-config", { verify });
    await run("sepolia:deploy-bToken", { verify });
    await run("sepolia:deploy-debtToken", { verify });

    await run("sepolia:deploy-reserve-oracle", { verify });
    await run("sepolia:deploy-nft-oracle", { verify });
    await run("sepolia:config-nft-oracle");

    await run("sepolia:config-reserves", { verify });
    await run("sepolia:config-nfts", { verify });

    await run("sepolia:deploy-punk-gateway", { verify, pool: ConfigNames.Bitty });
    await run("sepolia:deploy-weth-gateway", { verify });
    await run("sepolia:config-weth-gateway");
    await run("sepolia:deploy-data-provider", { verify, wallet: true, protocol: true, ui: true });
  });

task("verify:All", "verify contract").setAction(async ({ address, args, contract }, { run }) => {
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

task("sepolia:config-feed-admin", "")
  .addParam("address", "The feed admin address")
  .setAction(async ({ address }, { run }) => {
    await run("set-DRE");
    const nftOracle = await getNFTOracle();
    await nftOracle.setPriceFeedAdmin(address);
  });

task(`sepolia:deploy-punk-gateway`, `Deploys the PunkGateway contract`)
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addFlag("verify", `Verify contract via Etherscan API.`)
  .setAction(async ({ verify, pool }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");

    if (!DRE.network.config.chainId) {
      throw new Error("INVALID_CHAIN_ID");
    }

    const poolConfig = loadPoolConfig(pool);
    const addressesProvider = await getLendPoolAddressesProvider();

    const proxyAdmin = await getBittyProxyAdminById(eContractid.BittyProxyAdminPool);
    if (proxyAdmin == undefined || !notFalsyOrZeroAddress(proxyAdmin.address)) {
      throw Error("Invalid pool proxy admin in config");
    }

    const wethGateWay = await getWETHGateway();
    console.log("wethGateWay.address", wethGateWay.address);

    const punk = await getCryptoPunksMarketAddress(poolConfig);
    console.log("CryptoPunksMarket.address", punk);

    const wpunk = await getWrappedPunkTokenAddress(poolConfig, punk);
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

task("sepolia:punkgateway-authorize-caller-whitelist", "Initialize gateway configuration.")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("caller", "Address of whitelist")
  .addParam("flag", "Flag of whitelist, 0-1")
  .setAction(async ({ caller, flag }, localBRE) => {
    await localBRE.run("set-DRE");
    const punkGateway = await getPunkGateway();
    console.log("PunkGateway:", punkGateway.address);
    await waitForTx(await punkGateway.authorizeCallerWhitelist([caller], flag));
  });


task("sepolia:deploy-mock-aggregator", "Deploy one mock aggregator for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("decimals", "token decimals")
  .addParam("price", "init price")
  .setAction(async ({ verify, decimals, price }, localBRE) => {
    await localBRE.run("set-DRE");
    const mockAgg = await deployChainlinkMockAggregator("USDT/ETH", decimals, price, verify);

    console.log("Aggregator address:", mockAgg.address);
  });


task("sepolia:add-aggregator", "Doing oracle admin task")
  .addParam("reserve", "reserve address")
  .addParam("aggregator", "aggregator address")
  .setAction(async ({ reserve, aggregator }, DRE) => {
    await DRE.run("set-DRE");
    const addressesProvider = await getLendPoolAddressesProvider();
    const oracle = await getReserveOracle(await addressesProvider.getReserveOracle());
    const owwnerAddress = await oracle.owner();
    const ownerSigner = DRE.ethers.provider.getSigner(owwnerAddress);
    await waitForTx(await oracle.connect(ownerSigner).addAggregator(reserve, aggregator));
    const price = await oracle.getAssetPrice(reserve);
    console.log(price.toString());
  });