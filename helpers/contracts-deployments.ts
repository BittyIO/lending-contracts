import { Contract } from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { DRE, getDb, notFalsyOrZeroAddress } from "./misc-utils";
import {
  tEthereumAddress,
  eContractid,
  BittyPools,
  TokenContractId,
  NftContractId,
  IReserveParams,
  INftParams,
} from "./types";
import { MockContract } from "ethereum-waffle";
import { ConfigNames, getReservesConfigByPool, getNftsConfigByPool, loadPoolConfig } from "./configuration";
import { getDeploySigner } from "./contracts-getters";
import {
  LendPoolAddressesProviderRegistryFactory,
  BittyProtocolDataProviderFactory,
  MintableERC20,
  MintableERC20Factory,
  MintableERC721,
  MintableERC721Factory,
  BTokenFactory,
  DebtTokenFactory,
  BNFTFactory,
  BNFTRegistryFactory,
  InterestRateFactory,
  LendPoolConfiguratorFactory,
  LendPoolFactory,
  LendPoolAddressesProviderFactory,
  LendPoolLoanFactory,
  ReserveOracleFactory,
  NFTOracleFactory,
  MockNFTOracleFactory,
  MockReserveOracleFactory,
  ReserveLogicFactory,
  //NftLogicFactory,
  SelfdestructTransferFactory,
  WalletBalanceProviderFactory,
  WETH9MockedFactory,
  WETHGatewayFactory,
  CryptoPunksMarketFactory,
  WrappedPunkFactory,
  PunkGatewayFactory,
  MockChainlinkOracleFactory,
  BittyUpgradeableProxyFactory,
  BittyProxyAdminFactory,
  MockIncentivesControllerFactory,
  WrappedPunk,
  WETH9Mocked,
  UiPoolDataProviderFactory,
  BittyCollectorFactory,
  TimelockControllerFactory,
  WETH9,
  WETH9Factory,
  SupplyLogicFactory,
  BorrowLogicFactory,
  LiquidateLogicFactory,
  GenericLogicFactory,
  ConfiguratorLogicFactory,
  MockLoanRepaidInterceptorFactory,
  MockerERC721WrapperFactory,
  WrapperGatewayFactory,
  MockerERC721Wrapper,
  ChainlinkAggregatorHelperFactory,
  UniswapV3DebtSwapAdapterFactory,
} from "../types";
import {
  withSaveAndVerify,
  registerContractInJsonDb,
  linkBytecode,
  insertContractAddressInDb,
  rawInsertContractAddressInDb,
  getOptionalParamAddressPerNetwork,
  getContractAddressInDb,
  verifyContract,
} from "./contracts-helpers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { LendPoolLibraryAddresses } from "../types/LendPoolFactory";
import { eNetwork } from "./types";

const readArtifact = async (id: string) => {
  return (DRE as HardhatRuntimeEnvironment).artifacts.readArtifact(id);
};

export const deployLendPoolAddressesProviderRegistry = async (verify?: boolean) =>
  withSaveAndVerify(
    await (await new LendPoolAddressesProviderRegistryFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.LendPoolAddressesProviderRegistry,
    [],
    verify
  );

export const deployLendPoolAddressesProvider = async (marketId: string, verify?: boolean) =>
  withSaveAndVerify(
    await (await new LendPoolAddressesProviderFactory(await getDeploySigner()).deploy(marketId)).deployed(),
    eContractid.LendPoolAddressesProvider,
    [marketId],
    verify
  );

export const deployLendPoolConfigurator = async (verify?: boolean) => {
  const cfgLogicAddress = await getContractAddressInDb(eContractid.ConfiguratorLogic);

  const libraries = {
    [PLACEHOLDER_CONFIGURATOR_LOGIC]: cfgLogicAddress,
  };

  const lendPoolConfiguratorImpl = await (await new LendPoolConfiguratorFactory(libraries, await getDeploySigner()).deploy()).deployed();
  if (verify) {
    await verifyContract(eContractid.LendPoolConfiguratorImpl, lendPoolConfiguratorImpl, []);
  }
  return lendPoolConfiguratorImpl;
};

export const deployLendPoolLoan = async (verify?: boolean) => {
  const lendPoolLoanImpl = await (await new LendPoolLoanFactory(await getDeploySigner()).deploy()).deployed();
  if (verify) {
    await verifyContract(eContractid.LendPoolLoanImpl, lendPoolLoanImpl, []);
  }
  return lendPoolLoanImpl;
};

export const deployBNFTRegistry = async (verify?: boolean) => {
  const bnftRegistryImpl = await (await new BNFTRegistryFactory(await getDeploySigner()).deploy()).deployed();
  await insertContractAddressInDb(eContractid.BNFTRegistryImpl, bnftRegistryImpl.address);
  return await withSaveAndVerify(bnftRegistryImpl, eContractid.BNFTRegistry, [], verify);
};

export const deployReserveLogicLibrary = async (verify?: boolean) =>
  withSaveAndVerify(
    await (await new ReserveLogicFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.ReserveLogic,
    [],
    verify
  );

export const deployNftLogicLibrary = async (verify?: boolean) => {
  const nftLogicArtifact = await readArtifact(eContractid.NftLogic);
  const linkedNftLogicByteCode = linkBytecode(nftLogicArtifact, {
    //[eContractid.ReserveLogic]: reserveLogic.address,
  });

  const nftLogicFactory = await DRE.ethers.getContractFactory(nftLogicArtifact.abi, linkedNftLogicByteCode);

  const nftLogic = await (await nftLogicFactory.connect(await getDeploySigner()).deploy()).deployed();

  return await withSaveAndVerify(nftLogic, eContractid.NftLogic, [], verify);
};

export const deployGenericLogic = async (verify?: boolean) => {
  return await withSaveAndVerify(
    await (await new GenericLogicFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.GenericLogic,
    [],
    verify
  );
};

export const deployValidationLogic = async (reserveLogic: Contract, genericLogic: Contract, verify?: boolean) => {
  const validationLogicArtifact = await readArtifact(eContractid.ValidationLogic);

  const linkedValidationLogicByteCode = linkBytecode(validationLogicArtifact, {
    [eContractid.ReserveLogic]: reserveLogic.address,
    [eContractid.GenericLogic]: genericLogic.address,
  });

  const validationLogicFactory = await DRE.ethers.getContractFactory(
    validationLogicArtifact.abi,
    linkedValidationLogicByteCode
  );

  const validationLogic = await (await validationLogicFactory.connect(await getDeploySigner()).deploy()).deployed();

  return await withSaveAndVerify(validationLogic, eContractid.ValidationLogic, [], verify);
};

export const deploySupplyLogicLibrary = async (verify?: boolean) => {
  const validateLogicAddress = await getContractAddressInDb(eContractid.ValidationLogic);
  const libraries = {
    [PLACEHOLDER_VALIDATION_LOGIC]: validateLogicAddress,
  };

  return await withSaveAndVerify(
    await (await new SupplyLogicFactory(libraries, await getDeploySigner()).deploy()).deployed(),
    eContractid.SupplyLogic,
    [],
    verify
  );
};

export const deployBorrowLogicLibrary = async (verify?: boolean) => {
  const validateLogicAddress = await getContractAddressInDb(eContractid.ValidationLogic);
  const libraries = {
    [PLACEHOLDER_VALIDATION_LOGIC]: validateLogicAddress,
  };

  return await withSaveAndVerify(
    await (await new BorrowLogicFactory(libraries, await getDeploySigner()).deploy()).deployed(),
    eContractid.BorrowLogic,
    [],
    verify
  );
};

export const deployLiquidateLogicLibrary = async (verify?: boolean) => {
  const validateLogicAddress = await getContractAddressInDb(eContractid.ValidationLogic);
  const libraries = {
    [PLACEHOLDER_VALIDATION_LOGIC]: validateLogicAddress,
  };

  return await withSaveAndVerify(
    await (await new LiquidateLogicFactory(libraries, await getDeploySigner()).deploy()).deployed(),
    eContractid.LiquidateLogic,
    [],
    verify
  );
};

export const deployBittyLibraries = async (verify?: boolean) => {
  await deployLendPoolLibraries(verify);
  await deployConfiguratorLibraries(verify);
};

export const deployLendPoolLibraries = async (verify?: boolean) => {
  const genericLogic = await deployGenericLogic(verify);
  const reserveLogic = await deployReserveLogicLibrary(verify);
  const nftLogic = await deployNftLogicLibrary(verify);
  const validationLogic = await deployValidationLogic(reserveLogic, genericLogic, verify);

  const supplyLogic = await deploySupplyLogicLibrary(verify);
  const borrowLogic = await deployBorrowLogicLibrary(verify);
  const liquidateLogic = await deployLiquidateLogicLibrary(verify);
};

export const getLendPoolLibraries = async (verify?: boolean): Promise<LendPoolLibraryAddresses> => {
  const reserveLogicAddress = await getContractAddressInDb(eContractid.ReserveLogic);
  const nftLogicAddress = await getContractAddressInDb(eContractid.NftLogic);
  const validationLogicAddress = await getContractAddressInDb(eContractid.ValidationLogic);
  const genericLogicAddress = await getContractAddressInDb(eContractid.GenericLogic);
  const supplyLogicAddress = await getContractAddressInDb(eContractid.SupplyLogic);
  const borrowLogicAddress = await getContractAddressInDb(eContractid.BorrowLogic);
  const liquidateLogicAddress = await getContractAddressInDb(eContractid.LiquidateLogic);

  // Hardcoded solidity placeholders, if any library changes path this will fail.
  // The '__$PLACEHOLDER$__ can be calculated via solidity keccak, but the LendPoolLibraryAddresses Type seems to
  // require a hardcoded string.
  //
  //  how-to:
  //  1. PLACEHOLDER = solidity Keccak256(['string'], `${libPath}:${libName}`).slice(2, 36)
  //  2. LIB_PLACEHOLDER = `__$${PLACEHOLDER}$__`
  // or grab placeholdes from LendPoolLibraryAddresses at Typechain generation.
  //
  // libPath example: contracts/libraries/logic/GenericLogic.sol
  // libName example: GenericLogic
  return {
    //[PLACEHOLDER_GENERIC_LOGIC]: genericLogic.address,
    //[PLACEHOLDER_VALIDATION_LOGIC]: validationLogicAddress,
    [PLACEHOLDER_RESERVE_LOGIC]: reserveLogicAddress,
    [PLACEHOLDER_NFT_LOGIC]: nftLogicAddress,
    [PLACEHOLDER_SUPPLY_LOGIC]: supplyLogicAddress,
    [PLACEHOLDER_BORROW_LOGIC]: borrowLogicAddress,
    [PLACEHOLDER_LIQUIDATE_LOGIC]: liquidateLogicAddress,
  };
};

const PLACEHOLDER_GENERIC_LOGIC = "__$4c26be947d349222af871a3168b3fe584b$__";
const PLACEHOLDER_VALIDATION_LOGIC = "__$5201a97c05ba6aa659e2f36a933dd51801$__";
const PLACEHOLDER_RESERVE_LOGIC = "__$d3b4366daeb9cadc7528af6145b50b2183$__";
const PLACEHOLDER_NFT_LOGIC = "__$eceb79063fab52ea3826f3ee75ecd7f36d$__";
const PLACEHOLDER_SUPPLY_LOGIC = "__$2f7c76ee15bdc1d8f3b34a04b86951fc56$__";
const PLACEHOLDER_BORROW_LOGIC = "__$77c5a84c43428e206d5bf08427df63fefa$__";
const PLACEHOLDER_LIQUIDATE_LOGIC = "__$ce70b23849b5cbed90e6e2f622d8887206$__";
const PLACEHOLDER_CONFIGURATOR_LOGIC = "__$3b2ad8f1ea56cc7a60e9a93596bbfe9178$__";

export const deployConfiguratorLibraries = async (verify?: boolean) => {
  const cfgLogic = await deployConfiguratorLogicLibrary(verify);
};

export const deployConfiguratorLogicLibrary = async (verify?: boolean) => {
  return await withSaveAndVerify(
    await (await new ConfiguratorLogicFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.ConfiguratorLogic,
    [],
    verify
  );
};

export const deployLendPool = async (verify?: boolean) => {
  const libraries = await getLendPoolLibraries(verify);
  const lendPoolImpl = await (await new LendPoolFactory(libraries, await getDeploySigner()).deploy()).deployed();
  return await withSaveAndVerify(lendPoolImpl, eContractid.LendPoolImpl, [], verify);
};

export const deployReserveOracle = async (args: [], verify?: boolean) => {
  const oracleImpl = await (await new ReserveOracleFactory(await getDeploySigner()).deploy()).deployed();
  await insertContractAddressInDb(eContractid.ReserveOracleImpl, oracleImpl.address);
  return await withSaveAndVerify(oracleImpl, eContractid.ReserveOracle, [], verify);
};

export const deployMockReserveOracle = async (args: [], verify?: boolean) =>
  withSaveAndVerify(
    await (await new MockReserveOracleFactory(await getDeploySigner()).deploy(...args)).deployed(),
    eContractid.MockReserveOracle,
    args,
    verify
  );

export const deployMockChainlinkOracle = async (decimals: string, verify?: boolean) =>
  withSaveAndVerify(
    await (await new MockChainlinkOracleFactory(await getDeploySigner()).deploy(decimals)).deployed(),
    eContractid.MockChainlinkOracle,
    [decimals],
    verify
  );

export const deployChainlinkAggregatorHelper = async (args: [], verify?: boolean) => {
  const aggHelperImpl = await (await new ChainlinkAggregatorHelperFactory(await getDeploySigner()).deploy()).deployed();
  await insertContractAddressInDb(eContractid.ChainlinkAggregatorHelperImpl, aggHelperImpl.address);
  return await withSaveAndVerify(aggHelperImpl, eContractid.ChainlinkAggregatorHelper, [], verify);
};

export const deployNFTOracle = async (verify?: boolean) => {
  const oracleImpl = await (await new NFTOracleFactory(await getDeploySigner()).deploy()).deployed();
  await insertContractAddressInDb(eContractid.NFTOracleImpl, oracleImpl.address);
  return await withSaveAndVerify(oracleImpl, eContractid.NFTOracle, [], verify);
};

export const deployMockNFTOracle = async (verify?: boolean) =>
  withSaveAndVerify(
    await (await new MockNFTOracleFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.MockNFTOracle,
    [],
    verify
  );

export const deployWalletBalancerProvider = async (verify?: boolean) =>
  withSaveAndVerify(
    await (await new WalletBalanceProviderFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.WalletBalanceProvider,
    [],
    verify
  );

export const deployBittyProtocolDataProvider = async (addressesProvider: tEthereumAddress, verify?: boolean) =>
  withSaveAndVerify(
    await (await new BittyProtocolDataProviderFactory(await getDeploySigner()).deploy(addressesProvider)).deployed(),
    eContractid.BittyProtocolDataProvider,
    [addressesProvider],
    verify
  );

export const deployUiPoolDataProvider = async (
  reserveOracle: tEthereumAddress,
  nftOracle: tEthereumAddress,
  verify?: boolean
) =>
  withSaveAndVerify(
    await (await new UiPoolDataProviderFactory(await getDeploySigner()).deploy(reserveOracle, nftOracle)).deployed(),
    eContractid.UIPoolDataProvider,
    [reserveOracle, nftOracle],
    verify
  );

export const deployMintableERC20 = async (args: [string, string, string], verify?: boolean): Promise<MintableERC20> =>
  withSaveAndVerify(
    await (await new MintableERC20Factory(await getDeploySigner()).deploy(...args)).deployed(),
    eContractid.MintableERC20,
    args,
    verify
  );

export const deployMintableERC721 = async (args: [string, string], verify?: boolean): Promise<MintableERC721> =>
  withSaveAndVerify(
    await (await new MintableERC721Factory(await getDeploySigner()).deploy(...args)).deployed(),
    eContractid.MintableERC721,
    args,
    verify
  );

export const deployInterestRate = async (args: [tEthereumAddress, string, string, string, string], verify: boolean) =>
  deployInterestRateWithID(eContractid.InterestRate, args, verify);

export const deployInterestRateWithID = async (
  id: string,
  args: [tEthereumAddress, string, string, string, string],
  verify: boolean
) => withSaveAndVerify(await (await new InterestRateFactory(await getDeploySigner()).deploy(...args)).deployed(), id, args, verify);

export const deployGenericDebtToken = async (verify?: boolean) =>
  withSaveAndVerify(await (await new DebtTokenFactory(await getDeploySigner()).deploy()).deployed(), eContractid.DebtToken, [], verify);

export const deployGenericBTokenImpl = async (verify: boolean) =>
  withSaveAndVerify(await (await new BTokenFactory(await getDeploySigner()).deploy()).deployed(), eContractid.BToken, [], verify);

export const deployGenericBNFTImpl = async (verify: boolean) =>
  withSaveAndVerify(await (await new BNFTFactory(await getDeploySigner()).deploy()).deployed(), eContractid.BNFT, [], verify);

export const deployAllMockTokens = async (forTestCases: boolean, verify?: boolean) => {
  const tokens: { [symbol: string]: MockContract | MintableERC20 | WETH9Mocked | WETH9 } = {};

  const protoConfigData = getReservesConfigByPool(BittyPools.proto);

  for (const tokenSymbol of Object.keys(TokenContractId)) {
    const tokenName = "Bitty Mock " + tokenSymbol;

    if (tokenSymbol === "WETH") {
      if (forTestCases) {
        tokens[tokenSymbol] = await deployWETHMocked();
      } else {
        tokens[tokenSymbol] = await deployWETH9();
      }
      await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
      continue;
    }

    let decimals = "18";
    if (tokenSymbol === "USDT" || tokenSymbol === "USDC") {
      decimals = "6";
    }

    let configData = (<any>protoConfigData)[tokenSymbol];

    tokens[tokenSymbol] = await deployMintableERC20(
      [tokenName, tokenSymbol, configData ? configData.reserveDecimals : decimals],
      verify
    );
    await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
  }
  return tokens;
};

export const deployOneMockToken = async (tokenSymbol: string, verify?: boolean) => {
  const protoConfigData = getReservesConfigByPool(BittyPools.proto);

  const tokenName = "Bitty Mock " + tokenSymbol;

  let decimals = "18";
  if (tokenSymbol === "USDT" || tokenSymbol === "USDC") {
    decimals = "6";
  }

  let configData = (<any>protoConfigData)[tokenSymbol];
  const tokenContract = await deployMintableERC20(
    [tokenName, tokenSymbol, configData ? configData.reserveDecimals : decimals],
    verify
  );
  await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokenContract);

  return tokenContract;
};

export const deployAllMockNfts = async (verify?: boolean) => {
  const tokens: { [symbol: string]: MockContract | MintableERC721 | WrappedPunk | MockerERC721Wrapper } = {};

  for (const tokenSymbol of Object.keys(NftContractId)) {
    const tokenName = "Bitty Mock " + tokenSymbol;
    if (tokenSymbol === "WPUNKS") {
      const cryptoPunksMarket = await deployCryptoPunksMarket([], verify);
      const wrappedPunk = await deployWrappedPunk([cryptoPunksMarket.address], verify);
      tokens[tokenSymbol] = wrappedPunk;
      await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
      continue;
    } else if (tokenSymbol == "WKODA") {
      const mockOtherdeed = await deployMockERC721Underlying("MockOtherdeed", ["Otherdeed", "OTHR"], verify);
      const wrappedKoda = await deployMockERC721Wrapper(
        "WrappedKoda",
        [mockOtherdeed.address, "Wrapped Otherdeed Koda", "WKODA"],
        verify
      );
      tokens[tokenSymbol] = wrappedKoda;
      await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
      continue;
    }

    tokens[tokenSymbol] = await deployMintableERC721([tokenName, tokenSymbol], verify);
    await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
  }
  return tokens;
};

export const deployWETHGateway = async (verify?: boolean) => {
  const wethImpl = await (await new WETHGatewayFactory(await getDeploySigner()).deploy()).deployed();
  return await withSaveAndVerify(wethImpl, eContractid.WETHGateway, [], verify);
};

export const deployWETH9 = async (verify?: boolean) =>
  withSaveAndVerify(await (await new WETH9Factory(await getDeploySigner()).deploy()).deployed(), eContractid.WETH, [], verify);

export const deployWETHMocked = async (verify?: boolean) =>
  withSaveAndVerify(await (await new WETH9MockedFactory(await getDeploySigner()).deploy()).deployed(), eContractid.WETHMocked, [], verify);

export const deploySelfdestructTransferMock = async (verify?: boolean) =>
  withSaveAndVerify(
    await (await new SelfdestructTransferFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.SelfdestructTransferMock,
    [],
    verify
  );

export const chooseBTokenDeployment = (id: eContractid) => {
  switch (id) {
    case eContractid.BToken:
      return deployGenericBTokenImpl;
    //case eContractid.DelegationAwareBToken:
    //  return deployDelegationAwareBTokenImpl;
    default:
      throw Error(`Missing bToken implementation deployment script for: ${id}`);
  }
};

export const deployBTokenImplementations = async (
  pool: ConfigNames,
  reservesConfig: { [key: string]: IReserveParams },
  verify = false
) => {
  const poolConfig = loadPoolConfig(pool);
  const network = <eNetwork>DRE.network.name;

  // Obtain the different BToken implementations of all reserves inside the Market config
  const tokenImplementations = [
    ...Object.entries(reservesConfig).reduce<Set<eContractid>>((acc, [, entry]) => {
      acc.add(entry.bTokenImpl);
      return acc;
    }, new Set<eContractid>()),
  ];

  for (let x = 0; x < tokenImplementations.length; x++) {
    const tokenAddress = getOptionalParamAddressPerNetwork(poolConfig[tokenImplementations[x].toString()], network);
    if (!notFalsyOrZeroAddress(tokenAddress)) {
      const deployImplementationMethod = chooseBTokenDeployment(tokenImplementations[x]);
      console.log(`Deploying BToken implementation`, tokenImplementations[x]);
      await deployImplementationMethod(verify);
    }
  }

  // Debt tokens, for now all Market configs follows same implementations
  const genericDebtTokenAddress = getOptionalParamAddressPerNetwork(poolConfig.DebtTokenImplementation, network);

  if (!notFalsyOrZeroAddress(genericDebtTokenAddress)) {
    await deployGenericDebtToken(verify);
  }
};

export const chooseBNFTDeployment = (id: eContractid) => {
  switch (id) {
    case eContractid.BNFT:
      return deployGenericBNFTImpl;
    //case eContractid.DelegationAwareBNFT:
    //  return deployDelegationAwareBNFTImpl;
    default:
      throw Error(`Missing bNFT implementation deployment script for: ${id}`);
  }
};

export const deployBNFTImplementations = async (
  pool: ConfigNames,
  NftsConfig: { [key: string]: INftParams },
  verify = false
) => {
  const poolConfig = loadPoolConfig(pool);
  const network = <eNetwork>DRE.network.name;

  // Obtain the different BNFT implementations of all nfts inside the Market config
  const bNftImplementations = [
    ...Object.entries(NftsConfig).reduce<Set<eContractid>>((acc, [, entry]) => {
      acc.add(entry.bNftImpl);
      return acc;
    }, new Set<eContractid>()),
  ];

  for (let x = 0; x < bNftImplementations.length; x++) {
    const bNftAddress = getOptionalParamAddressPerNetwork(poolConfig[bNftImplementations[x].toString()], network);
    if (!notFalsyOrZeroAddress(bNftAddress)) {
      const deployImplementationMethod = chooseBNFTDeployment(bNftImplementations[x]);
      console.log(`Deploying BNFT implementation`, bNftImplementations[x]);
      await deployImplementationMethod(verify);
    }
  }
};

export const deployRateStrategy = async (
  strategyName: string,
  args: [tEthereumAddress, string, string, string, string],
  verify: boolean
): Promise<tEthereumAddress> => {
  switch (strategyName) {
    default:
      return await (
        await deployInterestRate(args, verify)
      ).address;
  }
};

export const deployCryptoPunksMarket = async (args: [], verify?: boolean) =>
  withSaveAndVerify(
    await (await new CryptoPunksMarketFactory(await getDeploySigner()).deploy(...args)).deployed(),
    eContractid.CryptoPunksMarket,
    args,
    verify
  );

export const deployWrappedPunk = async (args: [tEthereumAddress], verify?: boolean) =>
  withSaveAndVerify(
    await (await new WrappedPunkFactory(await getDeploySigner()).deploy(...args)).deployed(),
    eContractid.WrappedPunk,
    args,
    verify
  );

export const deployPunkGateway = async (verify?: boolean) => {
  return await withSaveAndVerify(
    await (await new PunkGatewayFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.PunkGatewayImpl,
    [],
    verify);
};

export const deployBittyUpgradeableProxy = async (
  id: string,
  admin: tEthereumAddress,
  logic: tEthereumAddress,
  data: BytesLike,
  verify?: boolean
) =>
  withSaveAndVerify(
    await (await new BittyUpgradeableProxyFactory(await getDeploySigner()).deploy(logic, admin, data)).deployed(),
    id,
    [logic, admin, DRE.ethers.utils.hexlify(data)],
    verify
  );

export const deployBittyProxyAdmin = async (id: string, verify?: boolean) =>
  withSaveAndVerify(await (await new BittyProxyAdminFactory(await getDeploySigner()).deploy()).deployed(), id, [], verify);

export const deployMockIncentivesController = async (verify?: boolean) =>
  withSaveAndVerify(
    await (await new MockIncentivesControllerFactory(await getDeploySigner()).deploy()).deployed(),
    eContractid.MockIncentivesController,
    [],
    verify
  );

export const deployBittyCollector = async (args: [], verify?: boolean) => {
  const bittyCollectorImpl = await (await new BittyCollectorFactory(await getDeploySigner()).deploy()).deployed();
  if (verify) {
    await verifyContract(eContractid.BittyCollectorImpl, bittyCollectorImpl, []);
  }
  return bittyCollectorImpl;
};

export const deployTimelockController = async (
  id: string,
  minDelay: string,
  proposers: string[],
  executors: string[],
  verify?: boolean
) =>
  withSaveAndVerify(
    await (await new TimelockControllerFactory(await getDeploySigner()).deploy(minDelay, proposers, executors)).deployed(),
    id,
    [minDelay, proposers, executors],
    verify
  );

export const deployMockLoanRepaidInterceptor = async (addressesProvider: string, verify?: boolean) =>
  withSaveAndVerify(
    await (await new MockLoanRepaidInterceptorFactory(await getDeploySigner()).deploy(addressesProvider)).deployed(),
    eContractid.MockLoanRepaidInterceptor,
    [addressesProvider],
    verify
  );

export const deployMockERC721Underlying = async (id: string, args: [string, string], verify?: boolean) =>
  withSaveAndVerify(await (await new MintableERC721Factory(await getDeploySigner()).deploy(...args)).deployed(), id, args, verify);

export const deployMockERC721Wrapper = async (id: string, args: [string, string, string], verify?: boolean) =>
  withSaveAndVerify(await (await new MockerERC721WrapperFactory(await getDeploySigner()).deploy(...args)).deployed(), id, args, verify);

export const deployWrapperGateway = async (id: string, verify?: boolean) => {
  const gatewayImpl = await (await new WrapperGatewayFactory(await getDeploySigner()).deploy()).deployed();
  await rawInsertContractAddressInDb(id + "Impl", gatewayImpl.address);
  return await withSaveAndVerify(gatewayImpl, id, [], verify);
};

export const deployUniswapV3DebtSwapAdapter = async (verify?: boolean) => {
  const adapterImpl = await (await new UniswapV3DebtSwapAdapterFactory(await getDeploySigner()).deploy()).deployed();
  await rawInsertContractAddressInDb(eContractid.UniswapV3DebtSwapAdapterImpl, adapterImpl.address);
  return await withSaveAndVerify(adapterImpl, eContractid.UniswapV3DebtSwapAdapter, [], verify);
};
