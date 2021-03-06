# alice.js
A set of interfaces to interact with [Alice: Crypto Finance](https://alice.finance)'s smart contracts.

## Install

```sh
yarn add @alice-finance/alice.js
```
or

```sh
npm install @alice-finance/alice.js
```

## Getting Started
Alice's smart contracts are deployed on [Loom Network](https://loomx.io/developers/en/intro-to-loom.html) which is a DPOS sidechain that guarantees sub-second confirmation. So most of the transactions will happen on Loom Network. However, your assets need to be transferred from Ethereum Network. So alice.js interacts with both networks.

### Create private keys
First of all, you need to create private keys for both Ethereum Network and Loom Network.
```js
import { CryptoUtils } from "@alice-finance/alice.js";

const ethereumPrivateKey = CryptoUtils.createEthereumPrivateKey();
// save your ethereum private key
const loomPrivateKey = CryptoUtils.createLoomPrivateKey();
// save your loom private key
```

### Create Alice
If you have private keys, you can create an Alice.
```js
import Alice from "@alice-finance/alice.js";

const alice = new Alice(ethereumPrivateKey, loomPrivateKey);
```
or, you can create Alice using 12-words mnemonic.
```js
import Alice from "@alice-finance/alice.js";

const alice = Alice.fromMnemonic("glove amused flock sight want basic course invite chase paper crater defense"); // example mnemonic
```

### Map accounts
Your accounts in Ethereum Network and Loom Network must be mapped before deposit/withdrawal of assets.
```js
const mapped = await alice.areAccountsMapped();
if (!mapped) {
    await alice.mapAccounts();
}
```

### List of ERC20 assets
You can get the list of ERC20 assets that's registered in Alice
```js
const erc20Assets = await alice.getLoomChain().getERC20AssetsAsync();
```

### Deposit ETH/ERC20
ETH and ERC20 assets must be deposited to Loom Network prior to using Alice's financial services.
#### ETH
```js
import { BigNumberUtils } from "@alice-finance/alice.js";

const amount = BigNumberUtils.toBigNumber(10**18); // 1 ETH
const tx = await alice.getEthereumChain().depositETHAsync(amount);
await tx.wait();
```
#### ERC20
```js
import { BigNumberUtils } from "@alice-finance/alice.js";

const asset = new ERC20Asset("DAIToken", "DAI", 18, "0x...", "0x..."); // DAIToken
const gateway = alice.getEthereumChain().getGateway();
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
const approveTx = await alice.getEthereumChain().approveERC20Async(asset, gateway.address, amount);
await approveTx.wait();
const depositTx = await alice.getEthereumChain().depositERC20Async(asset, amount);
await depositTx.wait();
```

After **10 blocks** of confirmation, [transfer gateway](https://loomx.io/developers/en/transfer-gateway.html) oracle generates same amount of assets in Loom Network.

### Withdraw ETH/ERC20
ETH and ERC20 assets in Loom Network can be withdrawn to Ethereum Network.
#### ETH
```js
import { BigNumberUtils, Constants } from "@alice-finance/alice.js";

const amount = BigNumberUtils.toBigNumber(10**18); // 1 ETH
const ethereumGateway = alice.getEthereumChain().getGateway().address;
const myEthereumAddress = alice.getEthereumChain().getAddress().toLocalAddressString();
// Call to Loom Network
const tx1 = await alice.getLoomChain().withdrawETHAsync(amount, ethereumGateway);
await tx1.wait();
// Listen to the withdrawal signature
const signature = await alice.getLoomChain().listenToTokenWithdrawal(Constants.ZERO_ADDRESS, myEthereumAddress);
// Call to Ethereum Network
const tx2 = await alice.getEthereumChain().withdrawETHAsync(amount, signature);
await tx2.wait();
```
#### ERC20
```js
import { BigNumberUtils } from "@alice-finance/alice.js";

const asset = new ERC20Asset("DAIToken", "DAI", 18, "0x...", "0x..."); // DAIToken
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
// Call to Loom Network
const tx1 = await alice.getLoomChain().withdrawERC20Async(asset, amount);
await tx1.wait();
// Listen to the withdrawal signature
const signature = await alice.getLoomChain().listenToTokenWithdrawal(asset.ethereumAddress.toLocalAddressString(), myEthereumAddress);
// Call to Ethereum Network
const tx2 = await alice.getEthereumChain().withdrawERC20Async(asset, amount, signature);
await tx2.wait();
```
`LoomChain.listenToWithdrawal()` waits for 120 seconds then it times out if no withdrawal signature is generated.

### Start Savings
Now if you have DAIs in Loom Network, you can start savings.
```js
const loomChain = alice.getLoomChain();
const market = loomChain.getMoneyMarket();
const asset = await market.asset(); // DAIToken
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
const approveTx = await loomChain.approveERC20Async(asset, market.address, amount);
await approveTx.wait();
const depositTx = await market.deposit(amount);
await depositTx.wait();
```

### Get Savings Records
You can get the list of savings deposited.
```js
const myLoomAddress = alice.getLoomChain().getAddress().toLocalAddressString();
const savingRecords = await market.getSavingsRecords(myLoomAddress);
const recordId = savingRecords[0].id;
```

### Withdraw Savings
You can withdraw some or all amount of savings deposited.
```js
const loomChain = alice.getLoomChain();
const market = loomChain.getMoneyMarket();
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
const tx = await market.withdraw(recordId, amount);
await tx.wait();
```

## Author

👤 **[@YoonjaeYoo](https://github.com/YoonjaeYoo)**

