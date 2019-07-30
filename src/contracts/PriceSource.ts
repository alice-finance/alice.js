import { ethers } from "ethers";

export default class PriceSource extends ethers.Contract {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, require("@alice-finance/money-market/abis/IPriceSource.json"), signerOrProvider);
    }

    public getPrice(asset: string): Promise<ethers.utils.BigNumber> {
        return this.functions.getPrice(asset);
    }
}
