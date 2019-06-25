class EthereumConfig {
    public static create(testnet = false) {
        return new EthereumConfig(testnet ? this.rinkeby : this.mainnet);
    }
    private static rinkeby = { chainId: "4", networkName: "rinkeby" };
    private static mainnet = { chainId: "1", networkName: "mainnet" };
    public readonly chainId: string;
    public readonly networkName: string;
    public readonly gateway: { address: string; transactionHash: string };

    constructor({ chainId, networkName }: { chainId: string; networkName: string }) {
        this.chainId = chainId;
        this.networkName = networkName;
        this.gateway = require("../contracts/networks/Gateway.json")[this.chainId];
    }
}
export default EthereumConfig;
