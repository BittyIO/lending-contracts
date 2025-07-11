import BigNumber from "bignumber.js";
import { BigNumber as BN } from "ethers";
import { parseEther } from "ethers/lib/utils";

import { getReservesConfigByPool } from "../helpers/configuration";
import { MAX_UINT_AMOUNT, oneEther, ONE_YEAR } from "../helpers/constants";
import { getDebtToken } from "../helpers/contracts-getters";
import { convertToCurrencyDecimals, convertToCurrencyUnits } from "../helpers/contracts-helpers";
import { advanceBlock, advanceTimeAndBlock, sleep, waitForTx } from "../helpers/misc-utils";
import { BittyPools, iBittyPoolAssets, IReserveParams, ProtocolLoanState } from "../helpers/types";
import { ERC721Factory } from "../types";
import {
  approveERC20,
  approveERC20WrapperGateway,
  configuration as actionsConfiguration,
  deposit,
  mintERC20,
  setNftAssetPrice,
} from "./helpers/actions";
import { makeSuite, TestEnv } from "./helpers/make-suite";
import { configuration as calculationsConfiguration } from "./helpers/utils/calculations";
import {
  getERC20TokenBalance,
  getLoanData,
  getReserveAddressFromSymbol,
  getReserveData,
} from "./helpers/utils/helpers";

const chai = require("chai");
const { expect } = chai;

makeSuite("WrapperGateway", (testEnv: TestEnv) => {
  const zero = BN.from(0);

  before("Initializing configuration", async () => {
    // Sets BigNumber for this suite, instead of globally
    BigNumber.config({
      DECIMAL_PLACES: 0,
      ROUNDING_MODE: BigNumber.ROUND_DOWN,
    });

    actionsConfiguration.skipIntegrityCheck = false; //set this to true to execute solidity-coverage

    calculationsConfiguration.reservesParams = <iBittyPoolAssets<IReserveParams>>(
      getReservesConfigByPool(BittyPools.proto)
    );
  });
  after("Reset", () => {
    // Reset BigNumber
    BigNumber.config({
      DECIMAL_PLACES: 20,
      ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
    });
  });

  it("Borrow some USDC and repay it", async () => {
    const { users, mockOtherdeed, wrappedKoda, wrapperGateway, pool, dataProvider, usdc } = testEnv;

    const [depositor, borrower] = users;
    const depositUnit = "10000";
    const depositSize = await convertToCurrencyDecimals(usdc.address, depositUnit);

    // Deposit USDC
    await mintERC20(testEnv, depositor, "USDC", depositUnit.toString());
    await approveERC20(testEnv, depositor, "USDC");
    await deposit(testEnv, depositor, "", "USDC", depositUnit.toString(), depositor.address, "success", "");

    const borrowSize1 = await convertToCurrencyDecimals(usdc.address, "1000");
    const borrowSize2 = await convertToCurrencyDecimals(usdc.address, "2000");
    const borrowSizeAll = borrowSize1.add(borrowSize2);
    const repaySize = borrowSizeAll.add(borrowSizeAll.mul(5).div(100));
    const landId = testEnv.landIdTracker++;

    // Mint for interest
    await waitForTx(await usdc.connect(borrower.signer).mint(repaySize.sub(borrowSizeAll).toString()));
    await approveERC20WrapperGateway(testEnv, borrower, "USDC");

    const getDebtBalance = async () => {
      const loan = await getLoanData(pool, dataProvider, wrappedKoda.address, `${landId}`, "0");

      return BN.from(loan.currentAmount.toFixed(0));
    };
    const getOtherdeedOwner = async () => {
      return await mockOtherdeed.ownerOf(landId);
    };
    const getWrappedKodaOwner = async () => {
      return await wrappedKoda.ownerOf(landId);
    };

    await waitForTx(await mockOtherdeed.connect(borrower.signer).mint(landId));
    await waitForTx(await mockOtherdeed.connect(borrower.signer).approve(wrapperGateway.address, landId));

    const usdcBalanceBefore = await getERC20TokenBalance(usdc.address, borrower.address);

    // Delegates borrowing power of WETH to WETHGateway
    const reserveData = await pool.getReserveData(usdc.address);
    const debtToken = await getDebtToken(reserveData.debtTokenAddress);
    await waitForTx(
      await debtToken.connect(borrower.signer).approveDelegation(wrapperGateway.address, MAX_UINT_AMOUNT)
    );

    // borrow first usdc
    await waitForTx(
      await wrapperGateway.connect(borrower.signer).borrow(usdc.address, borrowSize1, landId, borrower.address, "0")
    );

    await advanceTimeAndBlock(100);

    // borrow more usdc
    await waitForTx(
      await wrapperGateway.connect(borrower.signer).borrow(usdc.address, borrowSize2, landId, borrower.address, "0")
    );

    const usdcBalanceAfterBorrow = await getERC20TokenBalance(usdc.address, borrower.address);
    const debtAfterBorrow = await getDebtBalance();
    const wrapperKodaOwner = await getWrappedKodaOwner();

    expect(usdcBalanceAfterBorrow).to.be.gte(usdcBalanceBefore.add(borrowSizeAll));
    expect(debtAfterBorrow).to.be.gte(borrowSizeAll);

    await advanceTimeAndBlock(100);

    // Repay partial
    await waitForTx(await wrapperGateway.connect(borrower.signer).repay(landId, repaySize.div(2)));
    const usdcBalanceAfterPartialRepay = await getERC20TokenBalance(usdc.address, borrower.address);
    const debtAfterPartialRepay = await getDebtBalance();

    expect(usdcBalanceAfterPartialRepay).to.be.lt(usdcBalanceAfterBorrow);
    expect(debtAfterPartialRepay).to.be.lt(debtAfterBorrow);
    expect(await getOtherdeedOwner()).to.be.eq(wrappedKoda.address);
    expect(await getWrappedKodaOwner(), "WrappedKoda should owned by loan after partial borrow").to.be.eq(
      wrapperKodaOwner
    );

    await advanceTimeAndBlock(100);

    // Repay full
    await waitForTx(await wrappedKoda.connect(borrower.signer).setApprovalForAll(wrapperGateway.address, true));
    await waitForTx(await wrapperGateway.connect(borrower.signer).repay(landId, repaySize));
    const usdcBalanceAfterFullRepay = await getERC20TokenBalance(usdc.address, borrower.address);
    const debtAfterFullRepay = await getDebtBalance();

    expect(usdcBalanceAfterFullRepay).to.be.lt(usdcBalanceAfterPartialRepay);
    expect(debtAfterFullRepay).to.be.eq(zero);
    expect(await getOtherdeedOwner()).to.be.eq(borrower.address);
  });

  it("Borrow all USDC and repay it", async () => {
    const { users, mockOtherdeed, wrappedKoda, wrapperGateway, usdc, pool, dataProvider } = testEnv;

    const [depositor, user] = users;

    // advance block to make some interests
    const secondsToTravel = new BigNumber(365).multipliedBy(ONE_YEAR).div(365).toNumber();
    await advanceTimeAndBlock(secondsToTravel);

    const usdcReserveData = await getReserveData(dataProvider, usdc.address);
    const borrowSize = new BigNumber(usdcReserveData.availableLiquidity);
    const repaySize = borrowSize.plus(borrowSize.multipliedBy(5).dividedBy(100));
    const landId = testEnv.landIdTracker++;

    await waitForTx(await mockOtherdeed.connect(user.signer).mint(landId));
    await waitForTx(await mockOtherdeed.connect(user.signer).approve(wrapperGateway.address, landId));

    // Delegates borrowing power of WETH to WETHGateway
    const reserveData = await pool.getReserveData(usdc.address);
    const debtToken = await getDebtToken(reserveData.debtTokenAddress);
    await waitForTx(await debtToken.connect(user.signer).approveDelegation(wrapperGateway.address, MAX_UINT_AMOUNT));

    // borrow all usdc
    await waitForTx(
      await wrapperGateway.connect(user.signer).borrow(usdc.address, borrowSize.toFixed(0), landId, user.address, "0")
    );

    // Check results
    const loanDataAfterBorrow = await dataProvider.getLoanDataByCollateral(wrappedKoda.address, landId);
    expect(loanDataAfterBorrow.state).to.be.eq(ProtocolLoanState.Active);

    // Repay all usdc
    await waitForTx(await wrappedKoda.connect(user.signer).setApprovalForAll(wrapperGateway.address, true));
    await waitForTx(await wrapperGateway.connect(user.signer).repay(landId, MAX_UINT_AMOUNT));

    // Check results
    const loanDataAfterRepayFull = await dataProvider.getLoanDataByLoanId(loanDataAfterBorrow.loanId);
    expect(loanDataAfterRepayFull.state).to.be.eq(ProtocolLoanState.Repaid);
  });

  it("Borrow some ETH and repay it", async () => {
    const { users, mockOtherdeed, wrappedKoda, wrapperGateway, wethGateway, weth, pool, dataProvider, loan } = testEnv;

    const [depositor, user, anotherUser] = users;
    const depositSize = parseEther("5");

    // Deposit with native ETH
    await waitForTx(
      await wethGateway.connect(depositor.signer).depositETH(depositor.address, "0", { value: depositSize })
    );

    const borrowSize1 = parseEther("1");
    const borrowSize2 = parseEther("2");
    const borrowSizeAll = borrowSize1.add(borrowSize2);
    const repaySize = borrowSizeAll.add(borrowSizeAll.mul(5).div(100));
    const landId = testEnv.landIdTracker++;

    const getDebtBalance = async () => {
      const loan = await getLoanData(pool, dataProvider, wrappedKoda.address, `${landId}`, "0");
      return BN.from(loan.currentAmount.toFixed(0));
    };
    const getOtherdeedOwner = async () => {
      return await mockOtherdeed.ownerOf(landId);
    };
    const getWrappedKodaOwner = async () => {
      return await wrappedKoda.ownerOf(landId);
    };

    await advanceTimeAndBlock(100);

    await waitForTx(await mockOtherdeed.connect(user.signer).mint(landId));
    await waitForTx(await mockOtherdeed.connect(user.signer).approve(wrapperGateway.address, landId));

    await advanceTimeAndBlock(100);

    const ethBalanceBefore = await user.signer.getBalance();

    // Delegates borrowing power of WETH to WETHGateway
    const reserveData = await pool.getReserveData(weth.address);
    const debtToken = await getDebtToken(reserveData.debtTokenAddress);
    await waitForTx(await debtToken.connect(user.signer).approveDelegation(wethGateway.address, MAX_UINT_AMOUNT));

    // borrow first eth
    await waitForTx(await wrapperGateway.connect(user.signer).borrowETH(borrowSize1, landId, user.address, "0"));

    await advanceTimeAndBlock(100);

    // borrow more eth
    await waitForTx(await wrapperGateway.connect(user.signer).borrowETH(borrowSize2, landId, user.address, "0"));

    // Check debt
    const loanDataAfterBorrow = await dataProvider.getLoanDataByCollateral(wrappedKoda.address, landId);
    expect(loanDataAfterBorrow.state).to.be.eq(ProtocolLoanState.Active);

    const wrapperKodaOwner = await getWrappedKodaOwner();
    const debtAfterBorrow = await getDebtBalance();

    expect(await user.signer.getBalance(), "current eth balance shoud increase").to.be.gt(ethBalanceBefore);
    expect(debtAfterBorrow, "debt should gte borrowSize").to.be.gte(borrowSizeAll);

    await advanceTimeAndBlock(100);

    // Repay partial
    await waitForTx(
      await wrapperGateway.connect(user.signer).repayETH(landId, repaySize.div(2), {
        value: repaySize.div(2),
      })
    );
    const loanDataAfterRepayPart = await dataProvider.getLoanDataByLoanId(loanDataAfterBorrow.loanId);
    const debtAfterPartialRepay = await getDebtBalance();

    expect(debtAfterPartialRepay).to.be.lt(debtAfterBorrow);
    expect(await getOtherdeedOwner()).to.be.eq(wrappedKoda.address);
    expect(await getWrappedKodaOwner(), "WrappedPunk should owned by loan after partial borrow").to.be.eq(
      wrapperKodaOwner
    );
    expect(loanDataAfterRepayPart.state).to.be.eq(ProtocolLoanState.Active);

    await advanceTimeAndBlock(100);

    // Repay full
    await waitForTx(await wrappedKoda.connect(user.signer).setApprovalForAll(wrapperGateway.address, true));
    await waitForTx(
      await wrapperGateway.connect(user.signer).repayETH(landId, MAX_UINT_AMOUNT, {
        value: repaySize,
      })
    );
    const debtAfterFullRepay = await getDebtBalance();
    const loanDataAfterRepayFull = await dataProvider.getLoanDataByLoanId(loanDataAfterBorrow.loanId);

    expect(debtAfterFullRepay).to.be.eq(zero);
    expect(await getOtherdeedOwner()).to.be.eq(user.address);
    expect(loanDataAfterRepayFull.state).to.be.eq(ProtocolLoanState.Repaid);
  });

  it("Borrow all ETH and repay it", async () => {
    const { users, pool, mockOtherdeed, wrappedKoda, wrapperGateway, weth, bWETH, wethGateway, dataProvider } = testEnv;

    const [depositor, user] = users;
    const depositSize = parseEther("5");

    // advance block to make some interests
    const secondsToTravel = new BigNumber(365).multipliedBy(ONE_YEAR).div(365).toNumber();
    await advanceTimeAndBlock(secondsToTravel);

    const wethReserveData = await getReserveData(dataProvider, weth.address);
    const borrowSize = new BigNumber(wethReserveData.availableLiquidity);
    const repaySize = borrowSize.plus(borrowSize.multipliedBy(5).dividedBy(100));
    const landId = testEnv.landIdTracker++;

    await waitForTx(await mockOtherdeed.connect(user.signer).mint(landId));
    await waitForTx(await mockOtherdeed.connect(user.signer).approve(wrapperGateway.address, landId));

    // Delegates borrowing power of WETH to WETHGateway
    const reserveData = await pool.getReserveData(weth.address);
    const debtToken = await getDebtToken(reserveData.debtTokenAddress);
    await waitForTx(await debtToken.connect(user.signer).approveDelegation(wethGateway.address, MAX_UINT_AMOUNT));

    // borrow all eth
    await waitForTx(
      await wrapperGateway.connect(user.signer).borrowETH(borrowSize.toFixed(0), landId, user.address, "0")
    );

    // Check results
    const loanDataAfterBorrow = await dataProvider.getLoanDataByCollateral(wrappedKoda.address, landId);
    expect(loanDataAfterBorrow.state).to.be.eq(ProtocolLoanState.Active);

    // Repay all eth
    await waitForTx(await wrappedKoda.connect(user.signer).setApprovalForAll(wrapperGateway.address, true));
    await waitForTx(
      await wrapperGateway.connect(user.signer).repayETH(landId, MAX_UINT_AMOUNT, {
        value: repaySize.toFixed(0),
      })
    );

    // Check results
    const loanDataAfterRepayFull = await dataProvider.getLoanDataByLoanId(loanDataAfterBorrow.loanId);
    expect(loanDataAfterRepayFull.state).to.be.eq(ProtocolLoanState.Repaid);
  });
});
