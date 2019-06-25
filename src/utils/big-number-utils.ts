import BN from "bn.js";
import { ethers } from "ethers";

export const toBigNumber = (value: ethers.utils.BigNumberish | BN) => {
    if (BN.isBN(value)) {
        return new ethers.utils.BigNumber(value.toString());
    } else {
        return ethers.utils.bigNumberify(value);
    }
};
