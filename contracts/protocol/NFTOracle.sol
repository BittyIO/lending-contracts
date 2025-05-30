// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {INFTOracle} from "../interfaces/INFTOracle.sol";
import {BlockContext} from "../utils/BlockContext.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract NFTOracle is INFTOracle, Initializable, OwnableUpgradeable, BlockContext {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

  modifier onlyAdmin() {
    require(_msgSender() == priceFeedAdmin, "NFTOracle: !admin");
    _;
  }

  event AssetAdded(address indexed asset);
  event AssetRemoved(address indexed asset);
  event AssetMappingAdded(address indexed mappedAsset, address indexed originAsset);
  event AssetMappingRemoved(address indexed mappedAsset, address indexed originAsset);
  event FeedAdminUpdated(address indexed admin);
  event SetAssetData(address indexed asset, uint256 price, uint256 timestamp, uint256 roundId);
  event SetAssetTwapPrice(address indexed asset, uint256 price, uint256 timestamp);

  struct NFTPriceData {
    uint256 roundId;
    uint256 price;
    uint256 timestamp;
  }

  struct NFTPriceFeed {
    bool registered;
    NFTPriceData[] nftPriceData;
  }

  //////////////////////////////////////////////////////////////////////////////
  // !!! Add new variable MUST append it only, do not insert, update type & name, or change order !!!
  // https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#potentially-unsafe-operations

  address public priceFeedAdmin;

  // key is nft contract address
  mapping(address => NFTPriceFeed) public nftPriceFeedMap;
  address[] public nftPriceFeedKeys;

  // data validity check parameters
  uint256 private constant DECIMAL_PRECISION = 10**18;

  mapping(address => bool) public nftPaused;

  // Mapping from original asset to mapped asset
  mapping(address => EnumerableSetUpgradeable.AddressSet) private _originalAssetToMappedAsset;
  // Mapping from mapped asset to original asset
  mapping(address => address) private _mappedAssetToOriginalAsset;

  // !!! For upgradable, MUST append one new variable above !!!
  //////////////////////////////////////////////////////////////////////////////

  modifier whenNotPaused(address _nftContract) {
    _whenNotPaused(_nftContract);
    _;
  }

  function _whenNotPaused(address _nftContract) internal view {
    bool _paused = nftPaused[_nftContract];
    require(!_paused, "NFTOracle: nft price feed paused");
  }

  function initialize(
    address _admin
  ) public initializer {
    __Ownable_init();
    priceFeedAdmin = _admin;
  }

  function setPriceFeedAdmin(address _admin) external onlyOwner {
    priceFeedAdmin = _admin;
    emit FeedAdminUpdated(_admin);
  }

  function setAssets(address[] calldata _nftContracts) external onlyOwner {
    for (uint256 i = 0; i < _nftContracts.length; i++) {
      _addAsset(_nftContracts[i]);
    }
  }

  function addAsset(address _nftContract) external onlyOwner {
    _addAsset(_nftContract);
  }

  function _addAsset(address _nftContract) internal {
    requireKeyExisted(_nftContract, false);
    nftPriceFeedMap[_nftContract].registered = true;
    nftPriceFeedKeys.push(_nftContract);
    emit AssetAdded(_nftContract);
  }

  function removeAsset(address _nftContract) external onlyOwner {
    requireKeyExisted(_nftContract, true);
    // make sure the asset mapping is empty before remove asset
    require(_originalAssetToMappedAsset[_nftContract].length() == 0, "NFTOracle: origin asset need unmapped first");
    require(_mappedAssetToOriginalAsset[_nftContract] == address(0), "NFTOracle: mapped asset need unmapped first");

    delete nftPriceFeedMap[_nftContract];

    uint256 length = nftPriceFeedKeys.length;
    for (uint256 i = 0; i < length; i++) {
      if (nftPriceFeedKeys[i] == _nftContract) {
        nftPriceFeedKeys[i] = nftPriceFeedKeys[length - 1];
        nftPriceFeedKeys.pop();
        break;
      }
    }
    emit AssetRemoved(_nftContract);
  }

  function setAssetMapping(
    address originAsset,
    address mappedAsset,
    bool added
  ) public onlyOwner {
    requireKeyExisted(originAsset, true);
    requireKeyExisted(mappedAsset, true);

    if (added) {
      // extra check for mapped asset
      require(_mappedAssetToOriginalAsset[mappedAsset] == address(0), "NFTOracle: mapped asset can not mapped again");
      require(
        _originalAssetToMappedAsset[mappedAsset].length() == (0),
        "NFTOracle: mapped asset already used as original asset"
      );
      // extra check for origin asset
      require(
        _mappedAssetToOriginalAsset[originAsset] == address(0),
        "NFTOracle: original asset already used as mapped asset"
      );

      _originalAssetToMappedAsset[originAsset].add(mappedAsset);
      _mappedAssetToOriginalAsset[mappedAsset] = originAsset;

      emit AssetMappingAdded(mappedAsset, originAsset);
    } else {
      _originalAssetToMappedAsset[originAsset].remove(mappedAsset);
      _mappedAssetToOriginalAsset[mappedAsset] = address(0);

      emit AssetMappingRemoved(mappedAsset, originAsset);
    }
  }

  function setAssetData(address _nftContract, uint256 _price) external override onlyAdmin whenNotPaused(_nftContract) {
    uint256 _timestamp = _blockTimestamp();
    _setAssetData(_nftContract, _price, _timestamp);
  }

  function setMultipleAssetsData(address[] calldata _nftContracts, uint256[] calldata _prices)
    external
    override
    onlyAdmin
  {
    require(_nftContracts.length == _prices.length, "NFTOracle: data length not match");
    uint256 _timestamp = _blockTimestamp();
    for (uint256 i = 0; i < _nftContracts.length; i++) {
      bool _paused = nftPaused[_nftContracts[i]];
      if (!_paused) {
        _setAssetData(_nftContracts[i], _prices[i], _timestamp);
      }
    }
  }

  function _setAssetData(
    address _nftContract,
    uint256 _price,
    uint256 _timestamp
  ) internal {
    requireKeyExisted(_nftContract, true);
    require(_timestamp > getLatestTimestamp(_nftContract), "NFTOracle: incorrect timestamp");
    require(_price > 0, "NFTOracle: price can not be 0");
    uint256 len = getPriceFeedLength(_nftContract);
    NFTPriceData memory data = NFTPriceData({price: _price, timestamp: _timestamp, roundId: len});
    nftPriceFeedMap[_nftContract].nftPriceData.push(data);

    emit SetAssetData(_nftContract, _price, _timestamp, len);

    // Set data for mapped assets
    address[] memory mappedAddresses = _originalAssetToMappedAsset[_nftContract].values();
    for (uint256 i = 0; i < mappedAddresses.length; i++) {
      nftPriceFeedMap[mappedAddresses[i]].nftPriceData.push(data);

      emit SetAssetData(mappedAddresses[i], _price, _timestamp, len);
    }
  }

  function getAssetMapping(address originAsset) public view override returns (address[] memory) {
    return _originalAssetToMappedAsset[originAsset].values();
  }

  function isAssetMapped(address originAsset, address mappedAsset) public view override returns (bool) {
    return _originalAssetToMappedAsset[originAsset].contains(mappedAsset);
  }

  function getAssetPrice(address _nftContract) public view override returns (uint256) {
    require(isExistedKey(_nftContract), "NFTOracle: key not existed");
    uint256 len = getPriceFeedLength(_nftContract);
    require(len > 0, "NFTOracle: no price data");
    return nftPriceFeedMap[_nftContract].nftPriceData[len - 1].price;
  }

  function getLatestTimestamp(address _nftContract) public view override returns (uint256) {
    require(isExistedKey(_nftContract), "NFTOracle: key not existed");
    uint256 len = getPriceFeedLength(_nftContract);
    if (len == 0) {
      return 0;
    }
    return nftPriceFeedMap[_nftContract].nftPriceData[len - 1].timestamp;
  }

  function getPreviousPrice(address _nftContract, uint256 _numOfRoundBack) public view override returns (uint256) {
    require(isExistedKey(_nftContract), "NFTOracle: key not existed");

    uint256 len = getPriceFeedLength(_nftContract);
    require(len > 0 && _numOfRoundBack < len, "NFTOracle: Not enough history");
    return nftPriceFeedMap[_nftContract].nftPriceData[len - _numOfRoundBack - 1].price;
  }

  function getPreviousTimestamp(address _nftContract, uint256 _numOfRoundBack) public view override returns (uint256) {
    require(isExistedKey(_nftContract), "NFTOracle: key not existed");

    uint256 len = getPriceFeedLength(_nftContract);
    require(len > 0 && _numOfRoundBack < len, "NFTOracle: Not enough history");
    return nftPriceFeedMap[_nftContract].nftPriceData[len - _numOfRoundBack - 1].timestamp;
  }

  function getPriceFeedLength(address _nftContract) public view returns (uint256 length) {
    return nftPriceFeedMap[_nftContract].nftPriceData.length;
  }

  function getLatestRoundId(address _nftContract) public view returns (uint256) {
    uint256 len = getPriceFeedLength(_nftContract);
    if (len == 0) {
      return 0;
    }
    return nftPriceFeedMap[_nftContract].nftPriceData[len - 1].roundId;
  }

  function isExistedKey(address _nftContract) private view returns (bool) {
    return nftPriceFeedMap[_nftContract].registered;
  }

  function requireKeyExisted(address _key, bool _existed) private view {
    if (_existed) {
      require(isExistedKey(_key), "NFTOracle: key not existed");
    } else {
      require(!isExistedKey(_key), "NFTOracle: key existed");
    }
  }

  function setPause(address _nftContract, bool val) external override onlyOwner {
    nftPaused[_nftContract] = val;
  }
}
