class LoomConfig {
    public static create(testnet = false) {
        return new LoomConfig(testnet ? this.extdev : this.plasma);
    }
    private static extdev = {
        chainId: "9545242630824",
        networkName: "extdev-plasma-us1",
        endpoint: "wss://extdev-plasma-us1.dappchains.com"
    };
    private static plasma = {
        chainId: "13654820909954",
        networkName: "default",
        endpoint: "wss://plasma.dappchains.com"
    };
    public readonly chainId: string;
    public readonly networkName: string;
    public readonly endpoint: string;
    public readonly erc20Registry: { address: string; transactionHash: string };
    public readonly moneyMarket: { address: string; transactionHash: string };

    constructor({ chainId, networkName, endpoint }: { chainId: string; networkName: string; endpoint: string }) {
        this.chainId = chainId;
        this.networkName = networkName;
        this.endpoint = endpoint;
        this.erc20Registry = require("@alice-finance/alice-proxies/networks/ERC20Registry.json")[this.chainId];
        this.moneyMarket = require("@alice-finance/money-market/networks/MoneyMarket.json")[this.chainId];
    }
}
export default LoomConfig;
