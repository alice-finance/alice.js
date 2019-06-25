import { ethers } from "ethers";

import Address from "../Address";
import EthereumConfig from "../config/EthereumConfig";
import { ZERO_ADDRESS } from "../constants";
import ERC20 from "../contracts/ERC20";
import Gateway from "../contracts/Gateway";
import ERC20Asset from "../ERC20Asset";
import { toBigNumber } from "../utils/big-number-utils";
import { getLogs } from "../utils/ethers-utils";

import Chain from "./Chain";

export interface ETHReceived {
    log: ethers.providers.Log;
    from: string;
    amount: ethers.utils.BigNumber;
}

export interface ERC20Received {
    log: ethers.providers.Log;
    from: string;
    amount: ethers.utils.BigNumber;
    contractAddress: string;
}

export interface ETHWithdrawn {
    log: ethers.providers.Log;
    owner: string;
    value: ethers.utils.BigNumber;
}

export interface ERC20Withdrawn {
    log: ethers.providers.Log;
    owner: string;
    contractAddress: string;
    value: ethers.utils.BigNumber;
}

class EthereumChain implements Chain {
    public readonly config: EthereumConfig;
    private provider!: ethers.providers.JsonRpcProvider;
    private wallet!: ethers.Wallet;
    private address!: Address;

    constructor(privateKey: string, testnet = false) {
        this.config = EthereumConfig.create(testnet);
        this.init(privateKey);
    }

    public getProvider = () => this.provider;

    public getAddress = () => this.address;

    public getSigner = () => this.wallet;

    public getGateway = () => {
        return new Gateway(this.config.gateway.address, this.getSigner());
    };

    public createERC20 = (asset: ERC20Asset) => {
        return new ERC20(asset.ethereumAddress.toLocalAddressString(), this.getSigner());
    };

    public updateAssetBalancesAsync = (
        assets: ERC20Asset[],
        updateBalance: (address: Address, balance: ethers.utils.BigNumber) => void
    ) => {
        return Promise.all(
            assets.map(asset => {
                const promise = asset.ethereumAddress.isZero()
                    ? this.balanceOfETHAsync()
                    : this.balanceOfERC20Async(asset);
                return promise.then(balance => updateBalance(asset.ethereumAddress, balance));
            })
        );
    };

    public transferERC20Async = (
        asset: ERC20Asset,
        to: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        const erc20 = this.createERC20(asset);
        return erc20.transfer({ to, value: amount });
    };

    public balanceOfETHAsync = (): Promise<ethers.utils.BigNumber> => {
        return this.provider.getBalance(this.address.toLocalAddressString());
    };

    public transferETHAsync = (
        to: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        return this.getSigner().sendTransaction({ to, value: amount.toHexString() });
    };

    public approveETHAsync = (
        spender: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        return Promise.resolve({
            to: ZERO_ADDRESS,
            from: this.address.toLocalAddressString(),
            confirmations: 0,
            nonce: 0,
            gasLimit: toBigNumber(0),
            gasPrice: toBigNumber(0),
            data: "0x",
            value: toBigNumber(0),
            chainId: Number(this.config.chainId),
            wait: () =>
                Promise.resolve({
                    byzantium: true
                })
        });
    };

    public balanceOfERC20Async = (asset: ERC20Asset): Promise<ethers.utils.BigNumber> => {
        const erc20 = this.createERC20(asset);
        return erc20.balanceOf(this.address.toLocalAddressString());
    };

    public approveERC20Async = (
        asset: ERC20Asset,
        spender: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        const erc20 = this.createERC20(asset);
        return erc20.approve(spender, amount);
    };

    /**
     * Deposit ETH to Gateway. The `amount` is transferred to `LoomChain` after 10 blocks of confirmations.
     *
     * @link https://loomx.io/developers/en/transfer-gateway.html
     *
     * @param amount
     */
    public depositETHAsync = (amount: ethers.utils.BigNumber): Promise<ethers.providers.TransactionResponse> => {
        const gateway = this.getGateway();
        return this.getSigner().sendTransaction({ to: gateway.address, value: amount });
    };

    /**
     * Deposit ERC20 `asset` to Gateway. The `amount` is transferred to `LoomChain` after 10 blocks of confirmations.
     *
     * @link https://loomx.io/developers/en/transfer-gateway.html
     *
     * @param asset
     * @param amount
     */
    public depositERC20Async = (
        asset: ERC20Asset,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        const gateway = this.getGateway();
        return gateway.depositERC20(amount, asset.ethereumAddress.toLocalAddressString());
    };

    /**
     * Withdraw `amount` of ETH from Gateway by submitting `signature`.
     * The signature is valid if generated by calling `LoomChain.withdrawETHAsync()`.
     *
     * @link https://loomx.io/developers/en/transfer-gateway.html
     *
     * @param amount
     * @param signature
     */
    public withdrawETHAsync = (
        amount: ethers.utils.BigNumber,
        signature: string
    ): Promise<ethers.providers.TransactionResponse> => {
        const gateway = this.getGateway();
        return gateway.withdrawETH(amount, signature);
    };

    /**
     * Withdraw `amount` of ERC20 `asset` from Gateway by submitting `signature`.
     * The signature is valid if generated by calling `LoomChain.withdrawETHAsync()`.
     *
     * @link https://loomx.io/developers/en/transfer-gateway.html
     *
     * @param asset
     * @param amount
     * @param signature
     */
    public withdrawERC20Async = (
        asset: ERC20Asset,
        amount: ethers.utils.BigNumber,
        signature: string
    ): Promise<ethers.providers.TransactionResponse> => {
        const gateway = this.getGateway();
        return gateway.withdrawERC20(amount, signature, asset.ethereumAddress.toLocalAddressString());
    };

    /**
     * Get a list of `ETHReceived` logs.
     * Every time `depositETHAsync` is called, an `ETHReceived` event is logged.
     *
     * @returns an array of `ETHReceived`
     */
    public getETHReceivedLogsAsync = async (): Promise<ETHReceived[]> => {
        const provider = this.getProvider();
        const gateway = this.getGateway();
        const blockNumber = await provider.getBlockNumber();
        const toBlock = Number(blockNumber);
        const transaction = await provider.getTransaction(this.config.gateway.transactionHash);
        const fromBlock = Number(transaction.blockNumber || 0);
        const event = gateway.interface.events.ETHReceived;
        const logs = await getLogs(provider, {
            address: this.config.gateway.address,
            topics: [event.topic],
            fromBlock,
            toBlock
        });
        return logs
            .sort((l1, l2) => (l2.blockNumber || 0) - (l1.blockNumber || 0))
            .map(log => ({
                log,
                ...event.decode(log.data)
            }))
            .filter(data => Address.createEthereumAddress(data.from || ZERO_ADDRESS).equals(this.getAddress()));
    };

    /**
     * Get a list of `ERC20Received` logs.
     * Every time `depositERC20Async` is called, an `ERC20Received` event is logged.
     *
     * @param asset
     *
     * @returns an array of `ERC20Received`
     */
    public getERC20ReceivedLogsAsync = async (asset: ERC20Asset): Promise<ERC20Received[]> => {
        const provider = this.getProvider();
        const gateway = this.getGateway();
        const blockNumber = await provider.getBlockNumber();
        const toBlock = Number(blockNumber);
        const transaction = await provider.getTransaction(this.config.gateway.transactionHash);
        const fromBlock = Number(transaction.blockNumber || 0);
        const event = gateway.interface.events.ERC20Received;
        const logs = await getLogs(provider, {
            address: this.config.gateway.address,
            topics: [event.topic],
            fromBlock,
            toBlock
        });
        return logs
            .sort((l1, l2) => (l2.blockNumber || 0) - (l1.blockNumber || 0))
            .map(log => ({
                log,
                ...event.decode(log.data)
            }))
            .filter(
                data =>
                    Address.createEthereumAddress(data.from || ZERO_ADDRESS).equals(this.getAddress()) &&
                    Address.createEthereumAddress(data.contractAddress || ZERO_ADDRESS).equals(asset.ethereumAddress)
            );
    };

    /**
     * Get a list of `ETHWithdrawn` logs.
     * Every time `withdrawETHAsync` is called, an `ETHWithdrawn` event is logged.
     *
     * @returns an array of `ETHWithdrawn`
     */
    public getETHWithdrawnLogsAsync = (): Promise<ETHWithdrawn[]> =>
        this.getTokenWithdrawnLogsAsync(Address.createEthereumAddress(ZERO_ADDRESS));

    /**
     * Get a list of `ERC20Withdrawn` logs.
     * Every time `withdrawERC20Async` is called, an `ERC20Withdrawn` event is logged.
     *
     * @returns an array of `ERC20Withdrawn`
     */
    public getERC20WithdrawnLogsAsync = (asset: ERC20Asset): Promise<ERC20Withdrawn[]> =>
        this.getTokenWithdrawnLogsAsync(asset.ethereumAddress);

    /**
     * Get your nonce for withdrawal. It increments every time you execute a withdrawal.
     */
    public getWithdrawalNonceAsync = async (): Promise<ethers.utils.BigNumber> => {
        const gateway = this.getGateway();
        return await gateway.nonces(this.getAddress().toLocalAddressString());
    };

    private getTokenWithdrawnLogsAsync = async (assetAddress: Address) => {
        const provider = this.getProvider();
        const gateway = this.getGateway();
        const blockNumber = await provider.getBlockNumber();
        const toBlock = Number(blockNumber);
        const transaction = await provider.getTransaction(this.config.gateway.transactionHash);
        const fromBlock = Number(transaction.blockNumber || 0);
        const event = gateway.interface.events.TokenWithdrawn;
        const logs = await getLogs(provider, {
            address: this.config.gateway.address,
            topics: [event.topic, event.encodeTopics([this.getAddress().toLocalAddressString()])],
            fromBlock,
            toBlock
        });
        return logs
            .sort((l1, l2) => (l2.blockNumber || 0) - (l1.blockNumber || 0))
            .map(log => ({
                log,
                ...event.decode(log.data)
            }))
            .filter(data => Address.createEthereumAddress(data.contractAddress).equals(assetAddress));
    };

    private init(privateKey: string) {
        this.provider = new ethers.providers.InfuraProvider(this.config.networkName);
        this.provider.on("end", () => this.init(privateKey));
        this.provider.on("error", () => {});
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.address = Address.createEthereumAddress(this.wallet.address);
    }
}

export default EthereumChain;
