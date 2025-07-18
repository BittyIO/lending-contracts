import { TestEnv, makeSuite } from "./helpers/make-suite";

const { expect } = require("chai");

makeSuite("NFTOracle", (testEnv: TestEnv) => {
  before(async () => {});

  it("NFTOracle: Check owner (revert expected)", async () => {
    const { mockNftOracle, users } = testEnv;

    const mockNftOracleNotOwner = mockNftOracle.connect(users[5].signer);

    await expect(mockNftOracleNotOwner.setPriceFeedAdmin(users[0].address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await expect(mockNftOracleNotOwner.setAssets([users[0].address])).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(mockNftOracleNotOwner.addAsset(users[0].address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(mockNftOracleNotOwner.removeAsset(users[0].address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await expect(mockNftOracleNotOwner.setAssetMapping(users[0].address, users[1].address, true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("NFTOracle: Check feed admin (revert expected)", async () => {
    const { mockNftOracle, users } = testEnv;

    const mockNftOracleNotFeedAdmin = mockNftOracle.connect(users[5].signer);

    await expect(mockNftOracleNotFeedAdmin.setAssetData(users[0].address, 400)).to.be.revertedWith("NFTOracle: !admin");

    await expect(mockNftOracleNotFeedAdmin.setMultipleAssetsData([users[0].address], [400])).to.be.revertedWith(
      "NFTOracle: !admin"
    );
  });

  it("NFTOracle: Set Feed Admin", async () => {
    const { mockNftOracle, users } = testEnv;
    const admin = await mockNftOracle.priceFeedAdmin();
    await mockNftOracle.setPriceFeedAdmin(users[0].address);
    expect(await mockNftOracle.priceFeedAdmin()).eq(users[0].address);
    await mockNftOracle.setPriceFeedAdmin(admin);
    expect(await mockNftOracle.priceFeedAdmin()).eq(admin);
  });

  it("NFTOracle: Add Asset", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    expect(await mockNftOracle.nftPriceFeedKeys(0)).eq(users[0].address);
    await expect(mockNftOracle.connect(users[1].signer).addAsset(users[1].address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await mockNftOracle.removeAsset(users[0].address);
  });

  it("NFTOracle: Add Multi Assets", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    await mockNftOracle.addAsset(users[1].address);
    expect(await mockNftOracle.nftPriceFeedKeys(0)).eq(users[0].address);
    expect(await mockNftOracle.nftPriceFeedKeys(1)).eq(users[1].address);
    await mockNftOracle.removeAsset(users[0].address);
    await mockNftOracle.removeAsset(users[1].address);
  });

  it("NFTOracle: Remove 1 Asset When There's Only 1", async () => {
    const { mockNftOracle, users } = testEnv;

    let error;
    try {
      await mockNftOracle.nftPriceFeedKeys(0);
    } catch (e) {
      error = e;
    }
    expect(error).not.eq(undefined);
  });

  it("NFTOracle: Remove 1 Asset When There're 2", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    await mockNftOracle.addAsset(users[1].address);
    await mockNftOracle.removeAsset(users[0].address);
    expect(await mockNftOracle.nftPriceFeedKeys(0)).eq(users[1].address);
    expect(await mockNftOracle.getPriceFeedLength(users[1].address)).to.equal("0");
    await mockNftOracle.removeAsset(users[1].address);
  });

  it("NFTOracle: Set Asset Data", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    const r = await mockNftOracle.setAssetData(users[0].address, 400);
    // await expectEvent.inTransaction(r.tx, nftOracleInstance, "NFTPriceFeedDataSet", {
    //     key: addr1.address,
    //     price: 400,
    //     timestamp: 1444004400,
    //     roundId: "1",
    // })
    expect(await mockNftOracle.getPriceFeedLength(users[0].address)).to.equal("1");
    const price = await mockNftOracle.getAssetPrice(users[0].address);
    expect(price).to.equal("400");
    const timestamp = await mockNftOracle.getLatestTimestamp(users[0].address);
    expect(timestamp).to.equal(currentTime.add(15));
    await mockNftOracle.mock_setBlockTimestamp(currentTime);
    await mockNftOracle.removeAsset(users[0].address);
  });

  it("NFTOracle: Set Multiple Data", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    await mockNftOracle.setAssetData(users[0].address, 400);
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(30));
    await mockNftOracle.setAssetData(users[0].address, 410);
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(45));
    const r = await mockNftOracle.setAssetData(users[0].address, 420);

    expect(await mockNftOracle.getPriceFeedLength(users[0].address)).to.equal("3");
    const price = await mockNftOracle.getAssetPrice(users[0].address);
    expect(price).to.equal("420");
    const timestamp = await mockNftOracle.getLatestTimestamp(users[0].address);
    expect(timestamp).to.equal(currentTime.add(45));
    await mockNftOracle.mock_setBlockTimestamp(currentTime);
    await mockNftOracle.removeAsset(users[0].address);
  });

  it("NFTOracle: Set Multiple Data use Multiple interface", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    await mockNftOracle.addAsset(users[1].address);
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    let assets: string[] = [users[0].address, users[1].address];
    let prices: string[] = ["400", "600", "800"];
    let prices1: string[] = ["410", "610"];
    let prices2: string[] = ["420", "620"];

    await expect(mockNftOracle.setMultipleAssetsData(assets, prices)).to.be.revertedWith(
      "NFTOracle: data length not match"
    );
    prices = ["400", "600"];
    await mockNftOracle.setMultipleAssetsData(assets, prices);
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(30));
    await mockNftOracle.setMultipleAssetsData(assets, prices1);
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(45));
    await mockNftOracle.setPause(users[1].address, true);
    let r = await mockNftOracle.setMultipleAssetsData(assets, prices2);
    expect(await mockNftOracle.getPriceFeedLength(users[0].address)).to.equal("3");
    expect(await mockNftOracle.getPriceFeedLength(users[1].address)).to.equal("2");
    await mockNftOracle.setPause(users[0].address, true);
    await mockNftOracle.setPause(users[1].address, false);
    r = await mockNftOracle.setMultipleAssetsData(assets, prices2);
    expect(await mockNftOracle.getPriceFeedLength(users[0].address)).to.equal("3");
    expect(await mockNftOracle.getPriceFeedLength(users[1].address)).to.equal("3");
    const price = await mockNftOracle.getAssetPrice(users[0].address);
    expect(price).to.equal("420");
    const price1 = await mockNftOracle.getAssetPrice(users[1].address);
    expect(price1).to.equal("620");
    const timestamp = await mockNftOracle.getLatestTimestamp(users[0].address);
    expect(timestamp).to.equal(currentTime.add(45));
    const timestamp1 = await mockNftOracle.getLatestTimestamp(users[1].address);
    expect(timestamp1).to.equal(currentTime.add(45));
    await mockNftOracle.mock_setBlockTimestamp(currentTime);
    await mockNftOracle.setPause(users[0].address, false);
    await mockNftOracle.removeAsset(users[0].address);
    await mockNftOracle.removeAsset(users[1].address);
  });

  it("NFTOracle: Set asset mapping", async () => {
    const { mockNftOracle, users } = testEnv;

    // add assets
    await mockNftOracle.addAsset(users[0].address);
    await mockNftOracle.addAsset(users[1].address);
    await mockNftOracle.addAsset(users[2].address);
    await mockNftOracle.addAsset(users[3].address);

    // add mapping
    const mappedAddresses = await mockNftOracle.getAssetMapping(users[0].address);
    expect(mappedAddresses.length).to.be.equal(0);

    await mockNftOracle.setAssetMapping(users[0].address, users[1].address, true);
    const mappedAddresses101 = await mockNftOracle.getAssetMapping(users[0].address);
    expect(mappedAddresses101.length).to.be.equal(1);
    const isMapped101 = await mockNftOracle.isAssetMapped(users[0].address, users[1].address);
    expect(isMapped101).to.be.equal(true);

    await mockNftOracle.setAssetMapping(users[0].address, users[2].address, true);
    const mappedAddresses102 = await mockNftOracle.getAssetMapping(users[0].address);
    expect(mappedAddresses102.length).to.be.equal(2);
    const isMapped102 = await mockNftOracle.isAssetMapped(users[0].address, users[2].address);
    expect(isMapped102).to.be.equal(true);

    // mapped asset can not be mapped again
    await expect(mockNftOracle.setAssetMapping(users[0].address, users[1].address, true)).to.be.revertedWith(
      "NFTOracle: mapped asset can not mapped again"
    );
    await expect(mockNftOracle.setAssetMapping(users[3].address, users[0].address, true)).to.be.revertedWith(
      "NFTOracle: mapped asset already used as original asset"
    );
    await expect(mockNftOracle.setAssetMapping(users[1].address, users[3].address, true)).to.be.revertedWith(
      "NFTOracle: original asset already used as mapped asset"
    );

    // update price
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    let assets: string[] = [users[0].address];
    let prices: string[] = ["400"];

    await mockNftOracle.setMultipleAssetsData(assets, prices);
    const ogAssetPrice = await mockNftOracle.getAssetPrice(users[0].address);
    expect(ogAssetPrice).to.equal("400");

    const mapAsset1Price = await mockNftOracle.getAssetPrice(users[1].address);
    expect(mapAsset1Price).to.equal("400");

    const mapAsset2Price = await mockNftOracle.getAssetPrice(users[2].address);
    expect(mapAsset2Price).to.equal("400");

    // assets can not be removed before removing mapping
    await expect(mockNftOracle.removeAsset(users[0].address)).to.be.revertedWith(
      "NFTOracle: origin asset need unmapped first"
    );
    await expect(mockNftOracle.removeAsset(users[1].address)).to.be.revertedWith(
      "NFTOracle: mapped asset need unmapped first"
    );

    // remove mapping
    await mockNftOracle.setAssetMapping(users[0].address, users[1].address, false);
    const mappedAddresses201 = await mockNftOracle.getAssetMapping(users[0].address);
    expect(mappedAddresses201.length).to.be.equal(1);
    const isMapped201 = await mockNftOracle.isAssetMapped(users[0].address, users[1].address);
    expect(isMapped201).to.be.equal(false);

    await mockNftOracle.setAssetMapping(users[0].address, users[2].address, false);
    const mappedAddresses202 = await mockNftOracle.getAssetMapping(users[0].address);
    expect(mappedAddresses202.length).to.be.equal(0);
    const isMapped202 = await mockNftOracle.isAssetMapped(users[0].address, users[2].address);
    expect(isMapped202).to.be.equal(false);

    // remove assets
    await mockNftOracle.removeAsset(users[0].address);
    await mockNftOracle.removeAsset(users[1].address);
    await mockNftOracle.removeAsset(users[2].address);
    await mockNftOracle.removeAsset(users[3].address);
  });

  it("NFTOracle: GetAssetPrice After Remove The Asset", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    await mockNftOracle.setAssetData(users[0].address, 400);
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(30));
    await mockNftOracle.setAssetData(users[0].address, 410);
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(45));
    await mockNftOracle.setAssetData(users[0].address, 420);

    await mockNftOracle.removeAsset(users[0].address);
    await expect(mockNftOracle.getAssetPrice(users[0].address)).to.be.revertedWith("key not existed");
    await expect(mockNftOracle.getLatestTimestamp(users[0].address)).to.be.revertedWith("key not existed");
  });

  it("NFTOracle: Round Id Can Be The Same", async () => {
    const { mockNftOracle, users } = testEnv;
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    await mockNftOracle.addAsset(users[0].address);
    await mockNftOracle.setAssetData(users[0].address, 400);
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(30));
    await mockNftOracle.setAssetData(users[0].address, 400);
    //await expectEvent.inTransaction(r.tx, nftOracleInstance, "SetAssetData")
    await mockNftOracle.removeAsset(users[0].address);
  });

  it("NFTOracle: force error, get data with no price feed data", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);

    expect(await mockNftOracle.getPriceFeedLength(users[0].address)).to.equal("0");
    expect(await mockNftOracle.getLatestTimestamp(users[0].address)).to.equal("0");
    await expect(mockNftOracle.getAssetPrice(users[0].address)).to.be.revertedWith("no price data");
    await expect(mockNftOracle.getPreviousPrice(users[0].address, 0)).to.be.revertedWith("Not enough history");
    await expect(mockNftOracle.getPreviousTimestamp(users[0].address, 0)).to.be.revertedWith("Not enough history");
    await mockNftOracle.removeAsset(users[0].address);
  });

  it("NFTOracle: force error, asset should be set first", async () => {
    // await expectRevert(
    //     nftOracleInstance.setAssetData(addr1.address, 400, 1444004415, 100),
    //     "key not existed",
    // )
    const { mockNftOracle, users } = testEnv;
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    await expect(mockNftOracle.setAssetData(users[0].address, 400)).to.be.revertedWith("key not existed");
    await mockNftOracle.mock_setBlockTimestamp(currentTime);
  });

  it("NFTOracle: force error, timestamp should be larger", async () => {
    const { mockNftOracle, users } = testEnv;
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    await mockNftOracle.addAsset(users[0].address);
    await mockNftOracle.setAssetData(users[0].address, 400);
    // await expectRevert(
    //     await nftOracleInstance.setAssetData(addr1.address, 400, 1444004400, 100),
    //     "incorrect timestamp",
    // )
    await expect(mockNftOracle.setAssetData(users[0].address, 400)).to.be.revertedWith("incorrect timestamp");
    await mockNftOracle.removeAsset(users[0].address);
    await mockNftOracle.mock_setBlockTimestamp(currentTime);
  });

  it("NFTOracle: force error, timestamp can't be the same", async () => {
    const { mockNftOracle, users } = testEnv;
    await mockNftOracle.addAsset(users[0].address);
    const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
    await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
    await mockNftOracle.setAssetData(users[0].address, 400);
    // await expectRevert(
    //     await nftOracleInstance.setAssetData(addr1.address, 400, 1444004415, 101),
    //     "incorrect timestamp",
    // )
    await expect(mockNftOracle.setAssetData(users[0].address, 400)).to.be.revertedWith("incorrect timestamp");
    await mockNftOracle.removeAsset(users[0].address);
    await mockNftOracle.mock_setBlockTimestamp(currentTime);
  });

  makeSuite("NFTOracle: getPreviousPrice/getPreviousTimestamp", () => {
    let baseTimestamp;
    before(async () => {
      const { mockNftOracle, users } = testEnv;
      await mockNftOracle.addAsset(users[0].address);
      const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
      baseTimestamp = currentTime;
      await mockNftOracle.setAssetData(users[0].address, 400);
      await mockNftOracle.mock_setBlockTimestamp(currentTime.add(15));
      await mockNftOracle.setAssetData(users[0].address, 410);
      await mockNftOracle.mock_setBlockTimestamp(currentTime.add(30));
      await mockNftOracle.setAssetData(users[0].address, 420);
    });
    after(async () => {
      const { mockNftOracle, users } = testEnv;
      await mockNftOracle.removeAsset(users[0].address);
    });

    it("get previous price (latest)", async () => {
      const { mockNftOracle, users } = testEnv;
      const price = await mockNftOracle.getPreviousPrice(users[0].address, 0);
      expect(price).to.equal("420");
      const timestamp = await mockNftOracle.getPreviousTimestamp(users[0].address, 0);
      expect(timestamp).to.equal(baseTimestamp.add(30)).toString();

      const price1 = await mockNftOracle.getPreviousPrice(users[0].address, 1);
      expect(price1).to.equal("410");
      const timestamp1 = await mockNftOracle.getPreviousTimestamp(users[0].address, 1);
      expect(timestamp1).to.equal(baseTimestamp.add(15)).toString();
    });

    it("get previous price", async () => {
      const { mockNftOracle, users } = testEnv;
      const price = await mockNftOracle.getPreviousPrice(users[0].address, 2);
      expect(price).to.equal("400");
      const timestamp = await mockNftOracle.getPreviousTimestamp(users[0].address, 2);
      expect(timestamp).to.equal(baseTimestamp).toString();
    });

    it("get latest round id", async () => {
      const { mockNftOracle, users } = testEnv;
      await mockNftOracle.addAsset(users[3].address);
      const id = await mockNftOracle.getLatestRoundId(users[0].address);
      expect(id).to.equal("2");
      const id1 = await mockNftOracle.getLatestRoundId(users[3].address);
      expect(id1).to.equal("0");
      const id2 = await mockNftOracle.getLatestRoundId(users[2].address);
      expect(id2).to.equal("0");
      const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
      baseTimestamp = currentTime;
      await mockNftOracle.mock_setBlockTimestamp(currentTime.add(5));
      await mockNftOracle.setAssetData(users[3].address, 400);
      const id3 = await mockNftOracle.getLatestRoundId(users[3].address);
      expect(id3).to.equal("0");
      await mockNftOracle.mock_setBlockTimestamp(currentTime.add(10));
      await mockNftOracle.setAssetData(users[3].address, 400);
      const id4 = await mockNftOracle.getLatestRoundId(users[3].address);
      expect(id4).to.equal("1");
    });

    it("force error, get previous price", async () => {
      const { mockNftOracle, users } = testEnv;
      await expect(mockNftOracle.getPreviousPrice(users[0].address, 3)).to.be.revertedWith("Not enough history");
      await expect(mockNftOracle.getPreviousTimestamp(users[0].address, 3)).to.be.revertedWith("Not enough history");
    });
  });

  makeSuite("NFTOracle: test pause", () => {
    before(async () => {});
    it("test pause", async () => {
      const { mockNftOracle, users } = testEnv;
      await mockNftOracle.addAsset(users[0].address);
      await mockNftOracle.addAsset(users[1].address);
      await mockNftOracle.addAsset(users[2].address);
      const currentTime = await mockNftOracle.mock_getCurrentTimestamp();
      await mockNftOracle.setAssetData(users[0].address, 400);
      await mockNftOracle.setPause(users[0].address, true);
      //await mockNftOracle.setAssetData(users[0].address, 410, currentTime.add(20), 101);
      await expect(mockNftOracle.setAssetData(users[0].address, 410)).to.be.revertedWith(
        "NFTOracle: nft price feed paused"
      );
      await mockNftOracle.setAssetData(users[2].address, 400);
      await mockNftOracle.setPause(users[0].address, false);
      await mockNftOracle.setAssetData(users[1].address, 410);
    });
  });
});
