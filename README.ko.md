# alice.js
[암호화폐 금융 서비스 Alice](https://alice.finance)의 스마트 계약과의 상호작용을 위한 인터페이스 집합.

## 설치

```sh
yarn add @alice-finance/alice.js
```
or

```sh
npm install @alice-finance/alice.js
```

## 시작하기
Alice의 스마트 계약은 1초 이내의 블록 확정을 보장하는 DPOS 사이드 체인 [룸 네트워크](https://loomx.io/developers/en/intro-to-loom.html)에 배포되어 있습니다. 따라서 대부분의 트랜잭션은 룸 네트워크에서 발생할 것입니다. 하지만 여러분의 자산은 우선 이더리움 네트워크에서 전송되어야 합니다. 따라서 alice.js는 두개의 네트워크와 모두 상호작용을 합니다.

### 개인키 생성
가장 먼저 이더리움과 룸 네트워크를 위한 개인키를 생성해야 합니다.
```js
import { CryptoUtils } from "@alice-finance/alice.js";

const ethereumPrivateKey = CryptoUtils.createEthereumPrivateKey();
// save your ethereum private key
const loomPrivateKey = CryptoUtils.createLoomPrivateKey();
// save your loom private key
```

### Create Alice
개인키를 생성했으면 Alice 객체를 초기화합니다.
```js
import Alice from "@alice-finance/alice.js";

const alice = new Alice(ethereumPrivateKey, loomPrivateKey);
```
혹은 12개의 단어로 구성된 mnemonic으로 초기화합니다.
```js
import Alice from "@alice-finance/alice.js";

const alice = Alice.fromMnemonic("glove amused flock sight want basic course invite chase paper crater defense"); // example mnemonic
```

### 계정 매핑하기
이더리움 네트워크와 룸 네트워크에 있는 각각의 계정은 자산의 입출금을 하기 전에 우선 매핑이 되어있어야 합니다.
```js
const mapped = await alice.areAccountsMapped();
if (!mapped) {
    await alice.mapAccounts();
}
```

### ERC20 자산 목록 가져오기
Alice에 등록되어 있는 ERC20 자산의 목록을 가져올 수 있습니다.
```js
const erc20Assets = await alice.loomChain.getERC20AssetsAsync();
```

### ETH/ERC20 입금하기
Alice의 금융 서비스를 사용하기 위해서는 ETH와 ERC20 자산이 룸네트워크로 입금되어야 합니다.
#### ETH
```js
import { BigNumberUtils } from "@alice-finance/alice.js";

const amount = BigNumberUtils.toBigNumber(10**18); // 1 ETH
const tx = await alice.ethereumChain.depositETHAsync(amount);
await tx.wait();
```
#### ERC20
```js
import { BigNumberUtils } from "@alice-finance/alice.js";

const asset = new ERC20Asset("DAIToken", "DAI", 18, "0x...", "0x..."); // DAIToken
const gateway = alice.ethereumChain.getGateway();
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
const approveTx = await alice.ethereumChain.approveERC20Async(asset, gateway.address, amount);
await approveTx.wait();
const depositTx = await alice.ethereumChain.depositERC20Async(asset, amount);
await depositTx.wait();
```

**10 블록**의 확정 이후에, [트랜스퍼 게이트웨이](https://loomx.io/developers/en/transfer-gateway.html) 오라클이 해당 수량만큼의 자산을 룸 네트워크에 생성합니다.

### ETH/ERC20 출금하기
룸 네트워크의 ETH와 ERC20 자산은 이더리움 네트워크로 출금될 수 있습니다.
#### ETH
```js
import { BigNumberUtils, Constants } from "@alice-finance/alice.js";

const amount = BigNumberUtils.toBigNumber(10**18); // 1 ETH
const ethereumGateway = alice.ethereumChain.getGateway().address;
const myEthereumAddress = alice.ethereumChain.getAddress().toLocalAddressString();
// Call to Loom Network
const tx1 = await alice.loomChain.withdrawETHAsync(amount, ethereumGateway);
await tx1.wait();
// Listen to the withdrawal signature
const signature = await alice.loomChain.listenToTokenWithdrawal(Constants.ZERO_ADDRESS, myEthereumAddress);
// Call to Ethereum Network
const tx2 = await alice.ethereumChain.withdrawETHAsync(amount, signature);
await tx2.wait();
```
#### ERC20
```js
import { BigNumberUtils } from "@alice-finance/alice.js";

const asset = new ERC20Asset("DAIToken", "DAI", 18, "0x...", "0x..."); // DAIToken
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
// Call to Loom Network
const tx1 = await alice.loomChain.withdrawERC20Async(asset, amount);
await tx1.wait();
// Listen to the withdrawal signature
const signature = await alice.loomChain.listenToTokenWithdrawal(asset.ethereumAddress.toLocalAddressString(), myEthereumAddress);
// Call to Ethereum Network
const tx2 = await alice.ethereumChain.withdrawERC20Async(asset, amount, signature);
await tx2.wait();
```
`LoomChain.listenToWithdrawal()` 함수는 120초를 기다리는데 그때까지 출금 서명이 생성되지 않으면 타임아웃 됩니다.

### 저축 시작하기
이제 룸 네트워크에 DAI 자산을 가지고 있으니 저축을 시작할 수 있습니다.
```js
const loomChain = alice.loomChain;
const market = loomChain.getMoneyMarket();
const asset = await market.asset(); // DAIToken
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
const approveTx = await loomChain.approveERC20Async(asset, market.address, amount);
await approveTx.wait();
const depositTx = await market.deposit(amount);
await depositTx.wait();
```

### 저축 기록 가져오기
입금된 저축 기록을 가져올 수 있습니다.
```js
const myLoomAddress = alice.loomChain.getAddress().toLocalAddressString();
const savingRecords = await market.getSavingsRecords(myLoomAddress);
const recordId = savingRecords[0].id;
```

### 저축 출금하기
입금된 저축 금액 중 일부 혹은 전체를 출금할 수 있습니다.
```js
const loomChain = alice.loomChain;
const market = loomChain.getMoneyMarket();
const amount = BigNumberUtils.toBigNumber(10**18); // 1 DAI
const tx = await market.withdraw(recordId, amount);
await tx.wait();
```

## Author

👤 **[@YoonjaeYoo](https://github.com/YoonjaeYoo)**

