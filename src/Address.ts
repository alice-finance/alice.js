import { Address as LoomAddress, LocalAddress } from "loom-js/dist";

import { ZERO_ADDRESS } from "./constants";

export default class Address extends LoomAddress {
    public static setLoomNetworkName(networkName: string) {
        this.networkName = networkName;
    }
    /**
     * @param address an address of format <Chain ID>:<Hex Address>
     */
    public static fromString(address: string): Address {
        const parts = address.split(":");
        if (parts.length !== 2) {
            throw new Error("Invalid address string");
        }
        return new Address(parts[0], LocalAddress.fromHexString(parts[1]));
    }

    /**
     * @param address Hex address
     * @returns an `Address` of chainId "eth"
     */
    public static createEthereumAddress(address: string): Address {
        return new Address("eth", LocalAddress.fromHexString(address));
    }

    /**
     * @param address Hex address
     * @returns an `Address` of chainId "default"
     */
    public static createLoomAddress(address: string): Address {
        return new Address(this.networkName, LocalAddress.fromHexString(address));
    }

    private static networkName = "default";

    public toLocalAddressString = () => this.local.toChecksumString();

    public toString = () => this.chainId + ":" + this.toLocalAddressString();

    public isZero = () => this.local.toString() === ZERO_ADDRESS;
}
