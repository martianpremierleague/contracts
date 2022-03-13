const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("MPL", function () {
  let MPL;
  let mpl;
  let deployer;
  let addr1;
  let addr2;

  const limit = 100;
  const maxQuantity = 10;
  const price = "0.08";
  const baseURI = "starterURI";
  const ownerLimit = 10;
  const baseImageURI = "A baseImageURI appears";
  const preRevealURI = "PreRevealURI is this";
  const revealBatchSize = 10;

  let message1;
  let signature1;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    MPL = await ethers.getContractFactory("MPL");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const addr2Address = await addr2.getAddress();

    // Deploy
    mpl = await MPL.deploy([
      deployerAddress,
      limit,
      maxQuantity,
      ownerLimit,
      ethers.utils.parseEther(price),
      baseURI,
      baseImageURI,
      preRevealURI,
      revealBatchSize,
    ]);

    const addr1Address = await addr1.getAddress();
    const index = 1;
    message1 = await mpl.createMessage(addr1Address, index);
    signature1 = await deployer.signMessage(ethers.utils.arrayify(message1));
  });

  describe("Initial state", function () {
    it("Initial variables are set", async function () {
      expect(await mpl.limit()).to.equal(limit);
      expect(await mpl.maxQuantity()).to.equal(maxQuantity);
      expect(await mpl.price()).to.equal(ethers.utils.parseEther(price));
      expect(await mpl.baseURI()).to.equal(baseURI);
      expect(await mpl.allowancesSigner()).to.equal(
        await deployer.getAddress()
      );
    });

    it("Minting is not available", async function () {
      await expect(mpl.mint(1, { value: ethers.utils.parseEther(price) })).to.be
        .reverted;
    });

    it("Mars list minting is not available", async function () {
      const addr1Mpl = mpl.connect(addr1);
      await expect(
        addr1Mpl.mintWithSignature(1, 1, signature1, {
          value: ethers.utils.parseEther(price),
        })
      ).to.be.reverted;
    });
  });
  describe("Mars list", function () {
    it("Signer signatures are valid", async function () {
      const addr1Address = await addr1.getAddress();
      expect(await mpl.validateSignature(addr1Address, 1, signature1)).to.equal(
        ethers.utils.hashMessage(ethers.utils.arrayify(message1))
      );
    });

    it("Non-signer does not generate valid signatures", async function () {
      const addr1Address = await addr1.getAddress();
      const index = 1;

      const message = await mpl.createMessage(addr1Address, index);
      const signature = await addr1.signMessage(ethers.utils.arrayify(message));

      await expect(mpl.validateSignature(addr1Address, index, signature)).to.be
        .reverted;
    });

    it("Non owner cannot activate the Mars List", async function () {
      const addr1Mpl = mpl.connect(addr1);
      await expect(addr1Mpl.setMarsList()).to.be.reverted;
    });

    it("Owner can update the Mars List", async function () {
      expect(await mpl.marsList()).to.equal(false);
      await mpl.setMarsList();
      expect(await mpl.marsList()).to.equal(true);
    });

    it("Can activate and use the Mars List", async function () {
      await mpl.setMarsList();

      const addr1Address = await addr1.getAddress();
      const addr1Mpl = mpl.connect(addr1);

      expect(await mpl.balanceOf(addr1Address)).to.equal(0);
      await addr1Mpl.mintWithSignature(maxQuantity, 1, signature1, {
        value: ethers.utils.parseEther((price * maxQuantity).toString()),
      });
      expect(await mpl.balanceOf(addr1Address)).to.equal(maxQuantity);
    });

    it("Mars list indexes cannot be re-used", async function () {
      await mpl.setMarsList();
      const addr1Mpl = mpl.connect(addr1);
      await addr1Mpl.mintWithSignature(maxQuantity, 1, signature1, {
        value: ethers.utils.parseEther((price * maxQuantity).toString()),
      });
      await expect(
        addr1Mpl.mintWithSignature(maxQuantity, 1, signature1, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        })
      ).to.be.reverted;
    });

    it("Address can't use another address' Mars List", async function () {
      await mpl.setMarsList();
      const addr2Mpl = mpl.connect(addr2);

      await expect(
        addr2Mpl.mintWithSignature(maxQuantity, 1, signature1, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        })
      ).to.be.reverted;
    });

    it("No reentrancy", async function () {
      const Attacker = await ethers.getContractFactory("Attacker");

      const deployerAddress = await deployer.getAddress();
      const attacker = await Attacker.deploy(mpl.address, deployerAddress);

      await mpl.setMarsList();
      await deployer.sendTransaction({
        to: attacker.address,
        value: ethers.utils.parseEther("10"),
      });

      const index = 1;
      const newMessage = await mpl.createMessage(attacker.address, index);
      const newSignature = await deployer.signMessage(
        ethers.utils.arrayify(newMessage)
      );
      expect(
        await mpl.validateSignature(attacker.address, index, newSignature)
      ).to.equal(ethers.utils.hashMessage(ethers.utils.arrayify(newMessage)));

      await expect(attacker.attackWithSignature(index, newSignature)).to.be
        .reverted;
    });

    it("Can't use an index below the minimumIndex", async function () {
      await mpl.setMarsList();
      await mpl.setMinimumIndex("1000");

      const addr1Mpl = mpl.connect(addr1);

      await expect(
        addr1Mpl.mintWithSignature(maxQuantity, 1, signature1, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        })
      ).to.be.reverted;
    });
  });
  describe("Public sale", function () {
    it("Non owner cannot activate the Public Sale", async function () {
      const addr1Mpl = mpl.connect(addr1);
      await expect(addr1Mpl.setPublicSale()).to.be.reverted;
    });

    it("Owner can update the Public Sale", async function () {
      expect(await mpl.publicSale()).to.equal(false);
      await mpl.setPublicSale();
      expect(await mpl.publicSale()).to.equal(true);
    });

    it("Can activate and mint, emitting transfers and updating total supply", async function () {
      await mpl.setPublicSale();
      const addr2Mpl = mpl.connect(addr2);
      const addr2Address = await addr2.getAddress();

      expect(await mpl.balanceOf(addr2Address)).to.equal(0);
      await expect(
        addr2Mpl.mint(maxQuantity, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        })
      ).to.emit(mpl, "Transfer");
      expect(await mpl.balanceOf(addr2Address)).to.equal(maxQuantity);
      expect(await mpl.totalSupply()).to.equal(maxQuantity);
    });

    it("Can activate, mint and deactivate", async function () {
      await mpl.setPublicSale();
      const addr2Mpl = mpl.connect(addr2);

      await expect(
        addr2Mpl.mint(maxQuantity, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        })
      ).to.emit(mpl, "Transfer");

      await mpl.setPublicSale();

      await expect(
        mpl.mint(maxQuantity, { value: ethers.utils.parseEther(price) })
      ).to.be.reverted;
    });

    it("Cannot mint more than the max quantity", async function () {
      await mpl.setPublicSale();
      const addr2Mpl = mpl.connect(addr2);
      const quantityToMint = maxQuantity + 1;

      await expect(
        addr2Mpl.mint(quantityToMint, {
          value: ethers.utils.parseEther((price * quantityToMint).toString()),
        })
      ).to.be.reverted;
    });

    it("Minting fails with insufficient value sent", async function () {
      await mpl.setPublicSale();
      const addr2Mpl = mpl.connect(addr2);
      const quantityToMint = 6;

      await expect(
        addr2Mpl.mint(quantityToMint, {
          value: ethers.utils.parseEther(
            (price * quantityToMint * 0.9).toString()
          ),
        })
      ).to.be.reverted;
    });

    it("Cannot mint more than the limit", async function () {
      await mpl.setPublicSale();
      const addr2Mpl = mpl.connect(addr2);

      for (let j = 0; j < limit / maxQuantity; j++) {
        await addr2Mpl.mint(maxQuantity, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        });
      }

      await expect(
        addr2Mpl.mint(1, {
          value: ethers.utils.parseEther(price.toString()),
        })
      ).to.be.reverted;
    });

    it("No reentrancy", async function () {
      const Attacker = await ethers.getContractFactory("Attacker");

      const deployerAddress = await deployer.getAddress();
      const attacker = await Attacker.deploy(mpl.address, deployerAddress);

      await mpl.setPublicSale();
      await deployer.sendTransaction({
        to: attacker.address,
        value: ethers.utils.parseEther("10"),
      });

      await expect(attacker.attack()).to.be.reverted;
    });

    it("No multi-mint", async function () {
      const MultiMinter = await ethers.getContractFactory("MultiMinter");

      const deployerAddress = await deployer.getAddress();
      const multiMinter = await MultiMinter.deploy(
        mpl.address,
        deployerAddress
      );

      await mpl.setPublicSale();
      await deployer.sendTransaction({
        to: multiMinter.address,
        value: ethers.utils.parseEther("10"),
      });

      await expect(multiMinter.multiMint()).to.be.reverted;
    });
  });
  describe("Owner mint", function () {
    it("Non owner cannot ownerMint", async function () {
      const addr1Mpl = mpl.connect(addr1);
      await expect(addr1Mpl.ownerMint(1)).to.be.reverted;
    });

    it("Owner can ownerMint up to the limit", async function () {
      const deployerAddress = await deployer.getAddress();

      expect(await mpl.balanceOf(deployerAddress)).to.equal(0);
      await expect(mpl.ownerMint(ownerLimit)).to.emit(mpl, "Transfer");
      expect(await mpl.balanceOf(deployerAddress)).to.equal(ownerLimit);

      await expect(mpl.ownerMint(1)).to.be.reverted;
    });

    it("Owner cannot mint beyond the total supply", async function () {
      await mpl.setPublicSale();
      const addr1Mpl = mpl.connect(addr1);
      let supply = await mpl.totalSupply();
      while (supply.toNumber() < limit) {
        await addr1Mpl.mint(maxQuantity, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        });
        supply = await mpl.totalSupply();
      }

      await expect(addr1Mpl.mint(1)).to.be.reverted;
      await expect(mpl.ownerMint(1)).to.be.reverted;
    });
  });

  describe("Owner controls", function () {
    let newValue;
    let addr1Mpl;
    let deployerAddress;
    beforeEach(async function () {
      addr1Mpl = mpl.connect(addr1);
    });

    it("realOwner", async function () {
      newValue = await addr1.getAddress();
      deployerAddress = await deployer.getAddress();

      await expect(addr1Mpl.transferRealOwnership(newValue)).to.be.reverted;
      await expect(mpl.transferRealOwnership(newValue))
        .to.emit(mpl, "RealOwnershipTransferred")
        .withArgs(deployerAddress, newValue);
      expect(await mpl.realOwner()).to.equal(newValue);

      await expect(mpl.transferRealOwnership(newValue)).to.be.reverted;
      await expect(addr1Mpl.transferRealOwnership(deployerAddress))
        .to.emit(mpl, "RealOwnershipTransferred")
        .withArgs(newValue, deployerAddress);
    });

    it("owner", async function () {
      newValue = await addr1.getAddress();
      let oldValue = await mpl.owner();

      await expect(addr1Mpl.transferOwnership(newValue)).to.be.reverted;
      await expect(mpl.transferOwnership(newValue))
        .to.emit(mpl, "OwnershipTransferred")
        .withArgs(oldValue, newValue);

      expect(await mpl.owner()).to.equal(newValue);

      oldValue = await mpl.owner();
      newValue = await addr2.getAddress();
      await expect(mpl.transferOwnership(newValue))
        .to.emit(mpl, "OwnershipTransferred")
        .withArgs(oldValue, newValue);
    });

    it("baseURI", async function () {
      newValue = "ipfs://Qm.../";
      await expect(addr1Mpl.setBaseURI(newValue)).to.be.reverted;
      await expect(mpl.setBaseURI(newValue))
        .to.emit(mpl, "BaseURIUpdated")
        .withArgs(newValue);
      expect(await mpl.baseURI()).to.equal(newValue);
    });

    it("baseImageURI", async function () {
      newValue = "ipfs://Qm.../";
      await expect(addr1Mpl.setBaseImageURI(newValue)).to.be.reverted;
      await expect(mpl.setBaseImageURI(newValue))
        .to.emit(mpl, "BaseImageURIUpdated")
        .withArgs(newValue);
      expect(await mpl.baseImageURI()).to.equal(newValue);
    });

    it("frozen", async function () {
      newValue = "ipfs://Qm.../";
      await expect(addr1Mpl.setFrozen()).to.be.reverted;
      await expect(mpl.setFrozen()).to.emit(mpl, "Frozen");
      await expect(mpl.setBaseURI(newValue)).to.be.reverted;
      await expect(mpl.setBaseImageURI(newValue)).to.be.reverted;
    });

    it("preRevealURI", async function () {
      newValue = "ipfs://QmA2d.../";
      await expect(addr1Mpl.setPreRevealURI(newValue)).to.be.reverted;
      await expect(mpl.setPreRevealURI(newValue))
        .to.emit(mpl, "PreRevealURIUpdated")
        .withArgs(newValue);
      expect(await mpl.preRevealURI()).to.equal(newValue);
    });

    it("change signer via owner", async function () {
      newValue = await addr2.getAddress();
      await expect(mpl.transferOwnership(newValue));
      expect(await mpl.allowancesSigner()).to.equal(newValue);

      // verify that the new signer can create a valid signature
      const index = 1;
      const newMessage = await mpl.createMessage(newValue, index);
      const newSignature = await addr2.signMessage(
        ethers.utils.arrayify(newMessage)
      );
      expect(
        await mpl.validateSignature(newValue, index, newSignature)
      ).to.equal(ethers.utils.hashMessage(ethers.utils.arrayify(newMessage)));

      // old signature is no longer valid
      const addr1Address = await addr1.getAddress();
      await expect(
        mpl.validateSignature(addr1Address, index, signature1)
      ).to.be.revertedWith("!INVALID_SIGNATURE!");
    });

    it("limit", async function () {
      newValue = "200";
      await expect(addr1Mpl.setLimit(newValue)).to.be.reverted;
      await expect(mpl.setLimit(newValue))
        .to.emit(mpl, "LimitUpdated")
        .withArgs(newValue);
      expect(await mpl.limit()).to.equal(newValue);
    });

    it("maxQuantity", async function () {
      newValue = "20";
      await expect(addr1Mpl.setMaxQuantity(newValue)).to.be.reverted;
      await expect(mpl.setMaxQuantity(newValue))
        .to.emit(mpl, "MaxQuantityUpdated")
        .withArgs(newValue);
      expect(await mpl.maxQuantity()).to.equal(newValue);
    });

    it("price", async function () {
      newValue = ethers.utils.parseEther("0.1");
      await expect(addr1Mpl.setPrice(newValue)).to.be.reverted;
      await expect(mpl.setPrice(newValue))
        .to.emit(mpl, "PriceUpdated")
        .withArgs(newValue);
      expect(await mpl.price()).to.equal(newValue);
    });

    it("withdrawFunds", async function () {
      await mpl.setPublicSale();

      await addr1Mpl.mint(maxQuantity, {
        value: ethers.utils.parseEther((price * maxQuantity).toString()),
      });

      await expect(addr1Mpl.withdrawFunds()).to.be.reverted;

      const contractBalance = await ethers.provider.getBalance(mpl.address);
      await expect(await mpl.withdrawFunds())
        .to.changeEtherBalance(deployer, contractBalance)
        .to.emit(mpl, "FundsWithdrawn")
        .withArgs(contractBalance);
    });
  });

  describe("Simple ERC721", function () {
    let addr1Mpl;
    let addr1Address;
    let deployerAddress;
    beforeEach(async function () {
      await mpl.setPublicSale();
      addr1Mpl = mpl.connect(addr1);
      await addr1Mpl.mint(maxQuantity, {
        value: ethers.utils.parseEther((price * maxQuantity).toString()),
      });
      addr1Address = await addr1.getAddress();
      deployerAddress = await deployer.getAddress();
    });

    it("balances", async function () {
      expect(await mpl.balanceOf(addr1Address)).to.equal(maxQuantity);
      expect(await mpl.balanceOf(deployerAddress)).to.equal("0");
    });

    it("transfers", async function () {
      const tokenToTransfer = "2";

      await expect(
        mpl["safeTransferFrom(address,address,uint256)"](
          addr1Address,
          deployerAddress,
          tokenToTransfer
        )
      ).to.be.reverted;

      await expect(
        addr1Mpl["safeTransferFrom(address,address,uint256)"](
          addr1Address,
          deployerAddress,
          tokenToTransfer
        )
      )
        .to.emit(mpl, "Transfer")
        .withArgs(addr1Address, deployerAddress, tokenToTransfer);
      expect(await mpl.ownerOf(tokenToTransfer)).to.equal(deployerAddress);
      expect(await mpl.balanceOf(deployerAddress)).to.equal("1");
    });

    it("approvals", async function () {
      const tokenToApprove = "3";
      await expect(addr1Mpl.approve(deployerAddress, tokenToApprove))
        .to.emit(mpl, "Approval")
        .withArgs(addr1Address, deployerAddress, tokenToApprove);
      expect(await mpl.getApproved(tokenToApprove)).to.equal(deployerAddress);

      await expect(
        mpl["safeTransferFrom(address,address,uint256)"](
          addr1Address,
          deployerAddress,
          tokenToApprove
        )
      )
        .to.emit(mpl, "Transfer")
        .withArgs(addr1Address, deployerAddress, tokenToApprove);
    });

    it("approval for all", async function () {
      await expect(addr1Mpl.setApprovalForAll(deployerAddress, true))
        .to.emit(mpl, "ApprovalForAll")
        .withArgs(addr1Address, deployerAddress, true);
      expect(
        await mpl.isApprovedForAll(addr1Address, deployerAddress)
      ).to.equal(true);

      const tokenToTransfer = "2";
      await expect(
        mpl["safeTransferFrom(address,address,uint256)"](
          addr1Address,
          deployerAddress,
          tokenToTransfer
        )
      )
        .to.emit(mpl, "Transfer")
        .withArgs(addr1Address, deployerAddress, tokenToTransfer);
    });
  });

  describe("Metadata", function () {
    beforeEach(async function () {
      await mpl.setPublicSale();
    });

    it("No metadata for non-existent tokens", async function () {
      await expect(mpl.tokenURI("1")).to.be.reverted;
    });

    it("Pre-reveal returns pre-reveal metadata", async function () {
      await mpl.mint(1, {
        value: ethers.utils.parseEther(price.toString()),
      });
      expect(await mpl.tokenURI("0")).to.equal(preRevealURI);
    });

    it("Owner cannot reveal before batch is complete", async function () {
      await mpl.mint(1, {
        value: ethers.utils.parseEther(price.toString()),
      });
      await expect(mpl.setBatchOffset("1")).to.be.revertedWith(
        "BatchNotMinted"
      );
    });

    it("Owner can reveal once batch is complete", async function () {
      let minted = 0;
      for (let j = 0; minted <= revealBatchSize && minted < limit; j++) {
        await mpl.mint(maxQuantity, {
          value: ethers.utils.parseEther((price * maxQuantity).toString()),
        });
        minted += maxQuantity;
      }
      await expect(mpl.setBatchOffset("2")).to.be.revertedWith(
        "NonSequentialBatch"
      );
      await expect(mpl.setBatchOffset("1")).to.emit(mpl, "BatchRevealed");
      const shuffledId = await mpl.getShuffledId("0");
      expect(await mpl.tokenURI("0")).to.equal(
        baseURI + String(shuffledId) + ".json"
      );
    });

    describe("Reveal", function () {
      beforeEach(async function () {
        for (let j = 0; j < limit / maxQuantity; j++) {
          await mpl.mint(maxQuantity, {
            value: ethers.utils.parseEther((price * maxQuantity).toString()),
          });
        }
      });

      it("Can't reveal out of order'", async function () {
        await expect(mpl.setBatchOffset(2)).to.be.revertedWith(
          "NonSequentialBatch"
        );
      });

      it("Can reveal all batches", async function () {
        for (let j = 0; j < limit / revealBatchSize; j++) {
          await expect(mpl.setBatchOffset(j + 1)).to.emit(mpl, "BatchRevealed");
        }
      });

      it("Offset and within working as expected", async function () {
        for (let j = 0; j < limit / revealBatchSize; j++) {
          await expect(mpl.setBatchOffset(j + 1)).to.emit(mpl, "BatchRevealed");
        }

        const checkId = async (id) => {
          const batchMetadata = await mpl.offsets(
            Math.floor(id / revealBatchSize) + 1
          );
          const shuffledId = await mpl.getShuffledId(id);
          const within =
            ((id % revealBatchSize) + Number(batchMetadata.within)) %
            revealBatchSize;
          const calculatedShuffledId =
            within * (limit / revealBatchSize) + Number(batchMetadata.overall);

          expect(String(shuffledId)).to.equal(String(calculatedShuffledId));
        };

        checkId(0);
        checkId(5);
        checkId(Math.round(limit / 2));
        checkId(Math.round(limit / 3));
        checkId(limit - 1);
      });

      it("All token IDs are shuffled and present", async function () {
        for (let j = 0; j < limit / revealBatchSize; j++) {
          await mpl.setBatchOffset(j + 1);
        }
        const allIds = {};
        for (let j = 0; j < limit; j++) {
          const shuffledId = await mpl.getShuffledId(j.toString());
          allIds[shuffledId] = true;
        }
        for (let j = 0; j < limit; j++) {
          expect(allIds[j]).to.equal(true);
        }
      });
    });
  });
});
