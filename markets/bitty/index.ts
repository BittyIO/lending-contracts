import { oneRay, ZERO_ADDRESS } from "../../helpers/constants";
import { IBittyConfiguration, eEthereumNetwork } from "../../helpers/types";

import { CommonsConfig } from "./commons";
import { strategyWETH, strategyDAI, strategyUSDC, strategyUSDT } from "./reservesConfigs";
import {
  strategyNft_AZUKI,
  strategyNft_BAYC,
  strategyNft_CLONEX,
  strategyNft_COOL,
  strategyNft_DOODLE,
  strategyNft_KONGZ,
  strategyNft_MAYC,
  strategyNft_MEEBITS,
  strategyNft_WKODA,
  strategyNft_WOW,
  strategyNft_WPUNKS,
} from "./nftsConfigs";

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const BittyConfig: IBittyConfiguration = {
  ...CommonsConfig,
  MarketId: "Bitty genesis market",
  ProviderId: 1,
  ReservesConfig: {
    WETH: strategyWETH,
    DAI: strategyDAI,
    USDC: strategyUSDC,
    USDT: strategyUSDT,
  },
  NftsConfig: {
    WPUNKS: strategyNft_WPUNKS,
    BAYC: strategyNft_BAYC,
    DOODLE: strategyNft_DOODLE,
    SDOODLE: strategyNft_DOODLE,
    MAYC: strategyNft_MAYC,
    CLONEX: strategyNft_CLONEX,
    AZUKI: strategyNft_AZUKI,
    WKODA: strategyNft_WKODA,
  },
  ReserveAssets: {
    [eEthereumNetwork.hardhat]: {},
    [eEthereumNetwork.coverage]: {},
    [eEthereumNetwork.localhost]: {
      WETH: "0xB4B4ead1A260F1572b88b9D8ABa5A152D166c104",
      DAI: "0xa05ffF82bcC0C599984b0839218DC6ee9328d1Fb",
      USDC: "0x025FE4760c6f14dE878C22cEb09A3235F16dAe53",
    },
    [eEthereumNetwork.goerli]: {
      WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
      USDT: "0x8096Fd3B381164af8421F25c84063B8afC637fE5",
    },
    [eEthereumNetwork.rinkeby]: {
      WETH: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
      DAI: "0x51EA2fEb1b1EB0891595f846456068D497734ca4",
      USDC: "0xB07416EFa22C8A502ff3845D3c0BdA400f929cB8",
    },
    [eEthereumNetwork.main]: {
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    [eEthereumNetwork.sepolia]: {
      WETH: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
      USDT: "0x7169d38820dfd117c3fa1f22a697dba58d90ba06",
      USDC: "0x00000000100aaaf8cff772a414b18168fa758af9",
    },
  },
  NftsAssets: {
    [eEthereumNetwork.hardhat]: {},
    [eEthereumNetwork.coverage]: {},
    [eEthereumNetwork.localhost]: {
      WPUNKS: "0x5a60c5d89A0A0e08ae0CAe73453e3AcC9C335847",
      BAYC: "0x4e07D87De1CF586D51C3665e6a4d36eB9d99a457",
      DOODLE: "0x2F7f69a3cd22FcfFB5E0C0fB7Ae5Eb278b3919Ff",
      MAYC: "0x8b89F971cA1A5dE1B7df7f554a3024eE84FeeB05",
    },
    [eEthereumNetwork.goerli]: {
      WPUNKS: "0xbeD1e8B430FD512b82A18cb121a8442F3889E505",
      BAYC: "0x30d190032A34d6151073a7DB8793c01Aa05987ec",
      DOODLE: "0x317e19Fe3DB508f1A45421379FBbd7564d0259c0",
      SDOODLE: "0x82C348Ef21629f5aaeE5280ef3f4389Ad82F8799",
      MAYC: "0x15596C27900e12A9cfC301248E21888751f61c19",
      CLONEX: "0x578bc56a145A3464Adc44635C23501653138c946",
      AZUKI: "0x708c48AaA4Ea8B9E46Bd8DEb6470986842b9a16d",
    },
    [eEthereumNetwork.rinkeby]: {
      WPUNKS: "0x74e4418A41169Fb951Ca886976ccd8b36968c4Ab",
      BAYC: "0x588D1a07ccdb224cB28dCd8E3dD46E16B3a72b5e",
      DOODLE: "0x10cACFfBf3Cdcfb365FDdC4795079417768BaA74",
      COOL: "0x1F912E9b691858052196F11Aff9d8B6f89951AbD",
      MAYC: "0x9C235dF4053a415f028b8386ed13ae8162843a6e",
      CLONEX: "0xdd04ba0254972CC736F6966c496B4941f02BD816",
      AZUKI: "0x050Cd8082B86c5F469e0ba72ef4400E5E454886D",
    },
    [eEthereumNetwork.main]: {
      WPUNKS: "0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6",
      BAYC: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
      DOODLE: "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e",
      SDOODLE: "0x620b70123fb810f6c653da7644b5dd0b6312e4d8",
      MAYC: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
      CLONEX: "0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b",
      AZUKI: "0xed5af388653567af2f388e6224dc7c4b3241c544",
    },
    [eEthereumNetwork.sepolia]: {
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

  },
};

export default BittyConfig;
