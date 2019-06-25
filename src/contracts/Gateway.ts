import { ethers } from "ethers";

export default class Gateway extends ethers.Contract {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, require("./abis/Gateway.json"), signerOrProvider);
    }
}
