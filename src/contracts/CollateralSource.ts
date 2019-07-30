import { ethers } from "ethers";

export default class CollateralSource extends ethers.Contract {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, require("@alice-finance/money-market/abis/ICollateralSource.json"), signerOrProvider);
    }

    public getCollateralList(asset: string): Promise<string[]> {
        return this.functions.getCollateralList(asset);
    }

    public isCollateral(asset: string, collateral: string): Promise<boolean> {
        return this.functions.isCollateral(asset, collateral);
    }

    public getCollateralRate(asset: string, collateral: string): Promise<ethers.utils.BigNumber> {
        return this.functions.getCollateralRate(asset, collateral);
    }
}
