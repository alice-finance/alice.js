import { EthersSigner } from "loom-js/dist";
import { AddressMapper } from "loom-js/dist/contracts";

import EthereumChain from "./chains/EthereumChain";
import LoomChain from "./chains/LoomChain";
import { ethereumPrivateKeyFromMnemonic, loomPrivateKeyFromMnemonic } from "./utils/crypto-utils";

export default class Alice {
    public static fromMnemonic(mnemonic: string, testnet = false) {
        return new Alice(ethereumPrivateKeyFromMnemonic(mnemonic), loomPrivateKeyFromMnemonic(mnemonic), testnet);
    }

    public readonly ethereumChain: EthereumChain;
    public readonly loomChain: LoomChain;

    /**
     * @param ethereumPrivateKey - Ethereum Private Key (hex)
     * @param loomPrivateKey - Loom Private Key (base64)
     * @param testnet - `true` if you want to interact with testnet, `false` otherwise
     */
    constructor(ethereumPrivateKey: string, loomPrivateKey: string, testnet = false) {
        this.ethereumChain = new EthereumChain(ethereumPrivateKey, testnet);
        this.loomChain = new LoomChain(loomPrivateKey, testnet);
    }

    /**
     * @returns `true` if the ethereum account is mapped with the loom account
     */
    public areAccountsMapped = async () => {
        const addressMapper = await AddressMapper.createAsync(this.loomChain.getClient(), this.loomChain.getAddress());
        return await addressMapper.hasMappingAsync(this.ethereumChain.getAddress());
    };

    /**
     * Maps the ethereum account with the loom account if not mapped
     */
    public mapAccounts = async () => {
        const addressMapper = await AddressMapper.createAsync(this.loomChain.getClient(), this.loomChain.getAddress());
        if (await addressMapper.hasMappingAsync(this.ethereumChain.getAddress())) {
            // @ts-ignore
            const signer = new EthersSigner(this.ethereumChain.getSigner());
            await addressMapper.addIdentityMappingAsync(
                this.ethereumChain.getAddress(),
                this.loomChain.getAddress(),
                signer
            );
        }
    };
}
