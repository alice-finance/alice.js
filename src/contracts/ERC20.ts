import { ethers } from "ethers";

export default class ERC20 extends ethers.Contract {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, require("loom-js/dist/mainnet-contracts/ERC20.json"), signerOrProvider);
    }
}
