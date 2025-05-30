import { eContractid, IReserveParams, SymbolMap } from "../../helpers/types";

import {
  rateStrategyStableOne,
  rateStrategyStableTwo,
  rateStrategyStableThree,
  rateStrategyWETH,
  rateStrategyWBTC,
} from "./rateStrategies";

export const strategyBUSD: IReserveParams = {
  strategy: rateStrategyStableOne,
  borrowingEnabled: true,
  reserveDecimals: "18",
  bTokenImpl: eContractid.BToken,
  reserveFactor: "3000",
};

export const strategyDAI: IReserveParams = {
  strategy: rateStrategyStableTwo,
  borrowingEnabled: true,
  reserveDecimals: "18",
  bTokenImpl: eContractid.BToken,
  reserveFactor: "3000",
};

export const strategyUSDC: IReserveParams = {
  strategy: rateStrategyStableThree,
  borrowingEnabled: true,
  reserveDecimals: "6",
  bTokenImpl: eContractid.BToken,
  reserveFactor: "3000",
};

export const strategyUSDT: IReserveParams = {
  strategy: rateStrategyStableThree,
  borrowingEnabled: true,
  reserveDecimals: "6",
  bTokenImpl: eContractid.BToken,
  reserveFactor: "3000",
};

export const strategyWETH: IReserveParams = {
  strategy: rateStrategyWETH,
  borrowingEnabled: true,
  reserveDecimals: "18",
  bTokenImpl: eContractid.BToken,
  reserveFactor: "3000",
};

export const strategyWBTC: IReserveParams = {
  strategy: rateStrategyWBTC,
  borrowingEnabled: true,
  reserveDecimals: "18",
  bTokenImpl: eContractid.BToken,
  reserveFactor: "3000",
};

export const strategyReserveParams: SymbolMap<IReserveParams> = {
  WETH: strategyWETH,
  USDT: strategyUSDT,
  USDC: strategyUSDC,
  DAI: strategyDAI,
};
