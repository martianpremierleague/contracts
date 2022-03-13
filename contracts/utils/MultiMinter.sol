//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../MPL.sol";
import "@rari-capital/solmate/src/tokens/ERC721.sol";

contract MultiMinter
 {
  MPL public mpl;
  address public owner;

  constructor(address _mplAddress, address _owner) {
    mpl = MPL(_mplAddress);
    owner = _owner;
  }

  function onERC721Received(
      address,
      address,
      uint256,
      bytes calldata
  ) public pure returns (bytes4) {
      return ERC721TokenReceiver.onERC721Received.selector;
  }

  function multiMint() public {
    mpl.mint{value: mpl.price()}(1);
    mpl.mint{value: mpl.price()}(1);
    mpl.mint{value: mpl.price()}(1);
  }

  receive() external payable {}

}
