// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {IAaveLendPoolAddressesProvider} from "../adapters/interfaces/IAaveLendPoolAddressesProvider.sol";

contract MockAaveLendPoolAddressesProvider is IAaveLendPoolAddressesProvider {
  address public lendingPool;

  function setPool(address lendingPool_) public {
    lendingPool = lendingPool_;
  }

  function getPool() public view override returns (address) {
    return lendingPool;
  }
}
