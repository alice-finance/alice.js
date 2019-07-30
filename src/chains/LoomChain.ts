import BN from "bn.js";
import { ethers } from "ethers";
import {
    CachedNonceTxMiddleware,
    Client,
    CryptoUtils,
    LocalAddress,
    LoomProvider,
    SignedTxMiddleware
} from "loom-js/dist";
import { EthCoin, TransferGateway } from "loom-js/dist/contracts";
import { B64ToUint8Array, bytesToHexAddr, publicKeyFromPrivateKey } from "loom-js/dist/crypto-utils";
import { TransferGatewayTokenKind } from "loom-js/dist/proto/transfer_gateway_pb";

import Address from "../Address";
import LoomConfig from "../config/LoomConfig";
import CollateralSource from "../contracts/CollateralSource";
import ERC20 from "../contracts/ERC20";
import ERC20Registry from "../contracts/ERC20Registry";
import MoneyMarket from "../contracts/MoneyMarketLoanV1";
import PriceSource from "../contracts/PriceSource";
import ERC20Asset from "../ERC20Asset";
import { toBigNumber } from "../utils/big-number-utils";

import Chain from "./Chain";

class LoomChain implements Chain {
    public readonly config: LoomConfig;
    private readonly privateKey: string;
    private client!: Client;
    private provider!: ethers.providers.JsonRpcProvider;
    private address!: Address;
    private eth?: EthCoin;
    private gateway?: TransferGateway;

    constructor(privateKey: string, testnet = false) {
        this.config = LoomConfig.create(testnet);
        this.privateKey = privateKey;
        Address.setLoomNetworkName(this.config.networkName);
        this.init(B64ToUint8Array(privateKey));
    }

    public getPrivateKey = () => this.privateKey;

    public getClient = () => this.client;

    public getProvider = () => this.provider;

    public getAddress = () => this.address;

    public getSigner = (): ethers.Signer => this.provider.getSigner();

    public getETHAsync = () => {
        return this.eth
            ? Promise.resolve(this.eth)
            : EthCoin.createAsync(this.client, this.address).then(eth => {
                  this.eth = eth;
                  return eth;
              });
    };

    public getTransferGatewayAsync = () => {
        return this.gateway
            ? Promise.resolve(this.gateway)
            : TransferGateway.createAsync(this.client, this.address).then(gateway => {
                  this.gateway = gateway;
                  return gateway;
              });
    };

    public getERC20Registry = () => {
        return new ERC20Registry(this.config.erc20Registry.address, this.getSigner());
    };

    public getMoneyMarket = () => {
        return new MoneyMarket(this.config.moneyMarket.address, this.getSigner());
    };

    public getCollateralSource = () => {
        return new CollateralSource(this.config.collateralSource.address, this.getSigner());
    };

    public getPriceSource = () => {
        return new PriceSource(this.config.priceSource.address, this.getSigner());
    }

    public createERC20 = (asset: ERC20Asset) => {
        return new ERC20(asset.loomAddress.toLocalAddressString(), this.getSigner());
    };

    public getERC20AssetsAsync = async (): Promise<ERC20Asset[]> => {
        const tokens = await this.getERC20Registry().getRegisteredERC20Tokens();
        return tokens.map(
            token =>
                new ERC20Asset(
                    token.name,
                    token.symbol,
                    token.decimals,
                    Address.createLoomAddress(token.localAddress),
                    Address.createEthereumAddress(token.foreignAddress)
                )
        );
    };

    public updateAssetBalancesAsync = (
        assets: ERC20Asset[],
        updateBalance: (address: Address, balance: ethers.utils.BigNumber) => void
    ) => {
        return Promise.all(
            assets.map(asset => {
                const promise = asset.loomAddress.isZero() ? this.balanceOfETHAsync() : this.balanceOfERC20Async(asset);
                return promise.then(balance => {
                    updateBalance(asset.loomAddress, balance);
                });
            })
        );
    };

    public balanceOfETHAsync = async (): Promise<ethers.utils.BigNumber> => {
        const eth = await this.getETHAsync();
        return toBigNumber(await eth.getBalanceOfAsync(this.address));
    };

    public transferETHAsync = (
        to: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        return this.getETHAsync().then(eth => {
            return {
                hash: "0x02",
                to: eth.address.local.toChecksumString(),
                from: this.address.toLocalAddressString(),
                confirmations: 0,
                nonce: 0,
                gasLimit: toBigNumber(0),
                gasPrice: toBigNumber(0),
                data: "0x",
                value: amount,
                chainId: Number(this.config.chainId),
                wait: () => {
                    return eth.transferAsync(Address.createLoomAddress(to), new BN(amount.toString())).then(() => {
                        return { byzantium: true };
                    });
                }
            };
        });
    };

    public approveETHAsync = async (
        spender: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        return this.getETHAsync().then(eth => {
            return {
                hash: "0x02",
                to: eth.address.local.toChecksumString(),
                from: this.address.toLocalAddressString(),
                confirmations: 0,
                nonce: 0,
                gasLimit: toBigNumber(0),
                gasPrice: toBigNumber(0),
                data: "0x",
                value: toBigNumber(0),
                chainId: Number(this.config.chainId),
                wait: () => {
                    return eth.approveAsync(Address.createLoomAddress(spender), new BN(amount.toString())).then(() => {
                        return { byzantium: true };
                    });
                }
            };
        });
    };

    public transferERC20Async = (
        asset: ERC20Asset,
        to: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        const erc20 = this.createERC20(asset);
        return erc20.transfer(to, amount, { gasLimit: 0 });
    };

    public balanceOfERC20Async = (asset: ERC20Asset): Promise<ethers.utils.BigNumber> => {
        const erc20 = new ERC20(asset.loomAddress.toLocalAddressString(), this.getSigner());
        return erc20.balanceOf(this.address.toLocalAddressString());
    };

    public approveERC20Async = (
        asset: ERC20Asset,
        spender: string,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        const erc20 = new ERC20(asset.loomAddress.toLocalAddressString(), this.getSigner());
        return erc20.approve(spender, amount, { gasLimit: 0 });
    };

    /**
     * Withdraw `amount` of ETH to `EthereumChain`.
     *
     * @link https://loomx.io/developers/en/transfer-gateway.html
     *
     * @param amount
     * @param ethereumGateway Address of ethereum gateway
     */
    public withdrawETHAsync = (
        amount: ethers.utils.BigNumber,
        ethereumGateway: string
    ): Promise<ethers.providers.TransactionResponse> => {
        return this.getTransferGatewayAsync().then(gateway => {
            return {
                hash: "0x02",
                to: gateway.address.local.toChecksumString(),
                from: this.address.toLocalAddressString(),
                confirmations: 0,
                nonce: 0,
                gasLimit: toBigNumber(0),
                gasPrice: toBigNumber(0),
                data: "0x",
                value: toBigNumber(0),
                chainId: Number(this.config.chainId),
                wait: () => {
                    return gateway
                        .withdrawETHAsync(new BN(amount.toString()), Address.createEthereumAddress(ethereumGateway))
                        .then(() => {
                            return { byzantium: true };
                        });
                }
            };
        });
    };

    /**
     * Withdraw `amount` of ERC20 to `EthereumChain`.
     *
     * @link https://loomx.io/developers/en/transfer-gateway.html
     *
     * @param asset
     * @param amount
     */
    public withdrawERC20Async = (
        asset: ERC20Asset,
        amount: ethers.utils.BigNumber
    ): Promise<ethers.providers.TransactionResponse> => {
        return this.getTransferGatewayAsync().then(gateway => {
            return {
                hash: "0x02",
                to: gateway.address.local.toChecksumString(),
                from: this.address.toLocalAddressString(),
                confirmations: 0,
                nonce: 0,
                gasLimit: toBigNumber(0),
                gasPrice: toBigNumber(0),
                data: "0x",
                value: toBigNumber(0),
                chainId: Number(this.config.chainId),
                wait: () => {
                    return gateway.withdrawERC20Async(new BN(amount.toString()), asset.loomAddress).then(() => {
                        return { byzantium: true };
                    });
                }
            };
        });
    };

    /**
     * Withdraw `amount` of ERC20 to `EthereumChain`.
     *
     * @link https://loomx.io/developers/en/transfer-gateway.html
     *
     * @param assetAddress Address of ethereum asset contract. If asset is ETH, it should be 0x00000000000000000000.
     * @param ownerAddress Address of ethereum asset owner.
     */
    public listenToTokenWithdrawal = (assetAddress: string, ownerAddress: string): Promise<string> =>
        new Promise((resolve, reject) => {
            this.getTransferGatewayAsync().then(gateway => {
                const timer = setTimeout(
                    () => reject(new Error("Timeout while waiting for withdrawal to be signed")),
                    120000
                );
                gateway.on(TransferGateway.EVENT_TOKEN_WITHDRAWAL, event => {
                    if (
                        event.tokenContract.equals(Address.createEthereumAddress(assetAddress)) &&
                        event.tokenOwner.equals(Address.createEthereumAddress(ownerAddress))
                    ) {
                        clearTimeout(timer);
                        gateway.removeAllListeners(TransferGateway.EVENT_TOKEN_WITHDRAWAL);
                        resolve(bytesToHexAddr(event.sig));
                    }
                });
            });
        });

    /**
     * Get a pending ETH withdrawal receipt that has not been processed by `EthereumChain`.
     * If this returns non-null, you need to submit its signature to `EthereumChain`.
     *
     * @param ethereumNonce Nonce from calling `EthereumChain.getWithdrawalNonceAsync`.
     */
    public getPendingETHWithdrawalReceipt = async (ethereumNonce: ethers.utils.BigNumber) => {
        const gateway = await this.getTransferGatewayAsync();
        const receipt = await gateway.withdrawalReceiptAsync(this.getAddress());
        if (receipt && receipt.tokenKind === TransferGatewayTokenKind.ETH) {
            const loomNonce = receipt.withdrawalNonce.toString();
            if (toBigNumber(ethereumNonce).eq(toBigNumber(loomNonce))) {
                return receipt;
            }
        }
        return null;
    };

    /**
     * Get a pending ERC20 withdrawal receipt that has not been processed by `EthereumChain`.
     * If this returns non-null, you need to submit its signature to `EthereumChain`.
     *
     * @param ethereumNonce Nonce from calling `EthereumChain.getWithdrawalNonceAsync`.
     */
    public getPendingERC20WithdrawalReceipt = async (ethereumNonce: ethers.utils.BigNumber) => {
        const gateway = await this.getTransferGatewayAsync();
        const receipt = await gateway.withdrawalReceiptAsync(this.getAddress());
        if (receipt && receipt.tokenKind === TransferGatewayTokenKind.ERC20) {
            const loomNonce = receipt.withdrawalNonce.toString();
            if (toBigNumber(ethereumNonce).eq(toBigNumber(loomNonce))) {
                return receipt;
            }
        }
        return null;
    };

    private init = (privateKey: Uint8Array) => {
        const publicKey = publicKeyFromPrivateKey(privateKey);
        this.address = Address.createLoomAddress(
            LocalAddress.fromPublicKey(CryptoUtils.publicKeyFromPrivateKey(privateKey)).toChecksumString()
        );
        this.client = new Client(
            this.config.networkName,
            this.config.endpoint + "/websocket",
            this.config.endpoint + "/queryws"
        );
        this.client.txMiddleware = [
            new CachedNonceTxMiddleware(publicKey, this.client),
            new SignedTxMiddleware(privateKey)
        ];
        this.client.on("end", () => this.init(privateKey));
        this.client.on("error", () => {});
        this.provider = new ethers.providers.Web3Provider(
            new LoomProvider(this.client, privateKey, () => this.client.txMiddleware)
        );
    };
}

export default LoomChain;
