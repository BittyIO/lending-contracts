import { INftParams, IReserveParams, eContractid } from "../../helpers/types";
import { rateStrategyStableThree, rateStrategyWETH } from "../../markets/bitty/rateStrategies";

export enum Network {
    sepolia = "sepolia",
    main = "main",
  }
  
  export interface Params<T> {
    [Network.sepolia]: T;
    [Network.main]: T;
  }

  export const strategyNft: INftParams = {
    baseLTVAsCollateral: "4000", // 40%
    liquidationThreshold: "9000", // 90%
    liquidationBonus: "10000", // 5%
    redeemDuration: "4", // 4 hours
    auctionDuration: "4", // 4 hours
    redeemFine: "500", // 5%
    redeemThreshold: "5000", // 50%
    minBidFine: "20", // 0.2 ETH
    bNftImpl: eContractid.BNFT,
    maxSupply: "0",
    maxTokenId: "0",
  };
  

  
  export const getParams = <T>({ sepolia, main }: Params<T>, network: string): T => {
    network = Network[network as keyof typeof Network];
    switch (network) {
      case Network.sepolia:
        return sepolia;
      case Network.main:
        return main;
      default:
        return sepolia;
    }
  };
  
  export const BNFTRegistry: Params<string> = {
    [Network.sepolia]: '0x7853C3c5b7E473b0163f79c2ab85909bbFF69Eca',
    [Network.main]: '0x2aaEe23d422e054132D85Db145cA8B08Fb07aC64',
  };

  export const IncentivesController: Params<string> = {
    [Network.sepolia]: '0x0000000000000000000000000000000000000000',
    [Network.main]: '0x0000000000000000000000000000000000000000',
  };
   
  
  export const NftAssets: Params<Record<string, string>> = {
    [Network.sepolia]: {
      WPUNKS: '0xd4B17E11824F3cF0253cE012C8cD6B3300b2FFB5',
      BAYC: '0x00000066c6904D21F978A85D4D35719039E0f2Cb',
      MAYC: '0x000000A76D0B02Fd7f6f5C4E93F591f547EA2AFB',
      AZUKI: '0x0000008878FAf8CeE9859Af45c94Bc97818bba89',
      MEEBITS: '0x0000000D61B6Ec04C0Ac8De4a065D6626eCC313A',
      MIL: '0x000000553C40DBe365ccCD4690d188F1AA957ED1',
      PUDGY: '0x000088fb0b3f8c43da271DB60098A000D8bf1a62',
      MFER: '0x000000FFe81592Aafa726938b672E1d94bA58d05',
      LILP: '0x0000000EB7a675E278a37532E027754fB92716B8',
    },
    [Network.main]: {
      WPUNKS: '0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6',
      BAYC: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      MAYC: '0x60e4d786628fea6478f785a6d7e704777c86a7c6',
      AZUKI: '0xed5af388653567af2f388e6224dc7c4b3241c544',
      MEEBITS: '0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7',
      MIL: '0x5af0d9827e0c53e4799bb226655a1de152a425a5',
      PUDGY: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
      MFER: '0x79fcdef22feed20eddacbb2587640e45491b757f',
      LILP: '0x524cab2ec69124574082676e6f654a18df49a048',
    },
  };

  export const NftConfigs: Params<Record<string, INftParams>> = {
    [Network.sepolia]: {
      WPUNKS: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      BAYC: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      MAYC: {
        ...strategyNft,
        maxSupply: "20000",
        maxTokenId: "30007",
      },
      AZUKI: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      MEEBITS: {
        ...strategyNft,
        maxSupply: "20000",
        maxTokenId: "19999",
      },
      MIL: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      PUDGY: {
        ...strategyNft,
        maxSupply: "8888",
        maxTokenId: "8887",
      },
      MFER: {
        ...strategyNft,
        maxSupply: "10021",
        maxTokenId: "10020",
      },
      LILP: {
        ...strategyNft,
        maxSupply: "21905",
        maxTokenId: "21904",
      },
    },
    [Network.main]: {
      WPUNKS: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      BAYC: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      MAYC: {
        ...strategyNft,
        maxSupply: "20000",
        maxTokenId: "30007",
      },
      AZUKI: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      MEEBITS: {
        ...strategyNft,
        maxSupply: "20000",
        maxTokenId: "19999",
      },
      MIL: {
        ...strategyNft,
        maxSupply: "10000",
        maxTokenId: "9999",
      },
      PUDGY: {
        ...strategyNft,
        maxSupply: "8888",
        maxTokenId: "8887",
      },
      MFER: {
        ...strategyNft,
        maxSupply: "10021",
        maxTokenId: "10020",
      },
      LILP: {
        ...strategyNft,
        maxSupply: "21905",
        maxTokenId: "21904",
      }, 
    },
  };

  export const ReserveAssets: Params<Record<string, string>> = {
    [Network.sepolia]: {
      WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
      USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
      USDC: '0x00000000100aaAF8Cff772A414b18168FA758af9',
    },
    [Network.main]: {
      WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
  };

  export const ReserveConfigs: Params<Record<string, IReserveParams>> = {
    [Network.sepolia]: {
      WETH: {
        strategy: rateStrategyWETH,
        borrowingEnabled: true,
        reserveDecimals: "18",
        bTokenImpl: eContractid.BToken,
        reserveFactor: "3000",
      },
      USDT: {
        strategy: rateStrategyStableThree,
        borrowingEnabled: true,
        reserveDecimals: "6",
        bTokenImpl: eContractid.BToken,
        reserveFactor: "3000",
      },
      USDC: {
        strategy: rateStrategyStableThree,
        borrowingEnabled: true,
        reserveDecimals: "6",
        bTokenImpl: eContractid.BToken,
        reserveFactor: "3000",
      },
    },
    [Network.main]: {
      WETH: {
        strategy: rateStrategyWETH,
        borrowingEnabled: true,
        reserveDecimals: "18",
        bTokenImpl: eContractid.BToken,
        reserveFactor: "3000",
      },
      USDT: {
        strategy: rateStrategyStableThree,
        borrowingEnabled: true,
        reserveDecimals: "6",
        bTokenImpl: eContractid.BToken,
        reserveFactor: "3000",
      },
      USDC: {
        strategy: rateStrategyStableThree,
        borrowingEnabled: true,
        reserveDecimals: "6",
        bTokenImpl: eContractid.BToken,
        reserveFactor: "3000",
      },
    },
  };

  export const ReserveAggregators: Params<Record<string, string>> = {
    [Network.sepolia]: {
      USDT: '0x4fdDc83F44746bDd7D421F6E4CA0c84094E8FED0',
      USDC: '0x4fdDc83F44746bDd7D421F6E4CA0c84094E8FED0',
    },
    [Network.main]: {
      USDT: '0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46',
      USDC: '0x986b5E1e1755e3C2440e960477f25201B0a8bbD4',
    },
  };

  export const Punk: Params<string> = {
    [Network.sepolia]: '0x17D6f53fba815bAcE0e6921885addAd79add1340',
    [Network.main]: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  };