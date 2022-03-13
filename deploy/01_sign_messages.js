// deploy/01_sign_messages.js
const fs = require("fs");
const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts }) => {
  const { deployer } = await getNamedAccounts();

  const MPL = await ethers.getContract("MPL", deployer);

  // assumes the deployer account is the signer for the Mars List messages
  const deployerSigner = await hre.ethers.getSigner(deployer);

  // array of addresses which will receive a marsList spot
  const marsList = [deployer, deployer, deployer];

  async function generateSignatureFile(rawAddress, index) {
    try {
      // check that it's an address
      const address = await ethers.utils.getAddress(rawAddress.trim());

      // the contract provides the message to sign, given a recipient address & an index
      const message = await MPL.createMessage(address, index);
      const signature = await deployerSigner.signMessage(
        ethers.utils.arrayify(message)
      );

      const validated = await MPL.validateSignature(address, index, signature);

      // convert JSON object to string
      const data = JSON.stringify({ index, signature, address });
      console.log(data, validated);

      // write JSON string to a file which can be uploaded to ipfs
      fs.writeFileSync(`./allowances/${address}.json`, data);
    } catch (e) {
      console.log(`${rawAddress} failed: ${e}`);
    }
  }

  for (const [i, v] of marsList.entries()) {
    await new Promise((r) => setTimeout(r, 100));
    await generateSignatureFile(v, i);
  }
};
module.exports.tags = ["signMessages"];
