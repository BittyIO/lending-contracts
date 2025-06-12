export enum Network {
    sepolia = "sepolia",
    mainnet = "mainnet",
  }
  
  export interface Params<T> {
    [Network.sepolia]: T;
    [Network.mainnet]: T;
  }
  
  export const getParams = <T>({ sepolia, mainnet }: Params<T>, network: string): T => {
    network = Network[network as keyof typeof Network];
    switch (network) {
      case Network.sepolia:
        return sepolia;
      case Network.mainnet:
        return mainnet;
      default:
        return sepolia;
    }
  };
  
  
  export const FEE: Params<string> = {
    [Network.sepolia]: "400",
    [Network.mainnet]: "400",
  };

  export const BNFTRegistry: Params<string> = {
    [Network.sepolia]: '0x7853C3c5b7E473b0163f79c2ab85909bbFF69Eca',
    [Network.mainnet]: '',
  };

  export const IncentivesController: Params<string> = {
    [Network.sepolia]: '0x0000000000000000000000000000000000000000',
    [Network.mainnet]: '',
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
    [Network.mainnet]: {},
  };

  export const ReserveAssets: Params<Record<string, string>> = {
    [Network.sepolia]: {
      WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
      USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
      USDC: '0x00000000100aaAF8Cff772A414b18168FA758af9',
    },
    [Network.mainnet]: {},
  };

  export const ReserveAggregators: Params<Record<string, string>> = {
    [Network.sepolia]: {
      USDT: '0x4fdDc83F44746bDd7D421F6E4CA0c84094E8FED0',
      USDC: '0x4fdDc83F44746bDd7D421F6E4CA0c84094E8FED0',
    },
    [Network.mainnet]: {},
  };