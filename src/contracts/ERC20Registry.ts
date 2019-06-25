import { ethers } from "ethers";

export default class ERC20Registry extends ethers.Contract {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, require("@dnextco/alice-proxies/abis/ERC20Registry.json"), signerOrProvider);
    }
}
