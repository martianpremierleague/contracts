# MPL contracts

> Contracts are still in progress and may not reflect the final deployed versions.

## Quick start

```bash
yarn install
yarn test
```

## Contracts

MPL.sol: NFT contract

MultisigOwnable.sol: ownership, forked from [Tubbies](https://github.com/tubby-cats/dual-ownership-nft)

SignedAllowance.sol: verifying & tracking signed messages

BatchOffsets.sol: batched revealed of NFTs (zero-based token IDs, limit must divide into batches)

## Deploy scripts

00_deploy_mpl: deploys the MPL contract

01_sign_messages: signs messages for an array of addresses and saves them in /allowances

Utils: helper contracts for tests

## Ack.

- [scaffold-eth](https://github.com/scaffold-eth/scaffold-eth)
- [Azuki](https://www.azuki.com/erc721a)
- [Tubbies](https://github.com/0xngmi/tubbies)
- [dievardump](https://github.com/dievardump/signed-minting)
- [OZ](https://openzeppelin.com/contracts/)
- [solmate](https://github.com/Rari-Capital/solmate)
