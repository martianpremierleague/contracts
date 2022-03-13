// deploy/00_deploy_mpl.js
const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const limit = 100;
  const maxQuantity = 6;
  const ownerLimit = 5;
  const batchSize = 10;
  const price = "0.088";
  const baseURI = "ipfs://QmHash/";
  const imageURI = "ipfs://QmSecondHash/";
  const preRevealURI = "ipfs://QmThirdHash/0.json";

  await deploy("MPL", {
    from: deployer,
    args: [
      [
        deployer,
        limit,
        maxQuantity,
        ownerLimit,
        ethers.utils.parseEther(price),
        baseURI,
        imageURI,
        preRevealURI,
        batchSize,
      ],
    ],
    log: true,
  });
};
module.exports.tags = ["deployMPL"];
