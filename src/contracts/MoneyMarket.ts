import { ethers } from "ethers";

export interface SavingsRecord {
    id: ethers.utils.BigNumber;
    interestRate: ethers.utils.BigNumber;
    balance: ethers.utils.BigNumber;
    principal: ethers.utils.BigNumber;
    initialTimestamp: Date;
    lastTimestamp: Date;
    withdrawals: SavingsWithdrawal[];
}

export interface SavingsWithdrawal {
    recordId: ethers.utils.BigNumber;
    amount: ethers.utils.BigNumber;
    timestamp: Date;
}

const toSavingsRecord = (record: any[]) => ({
    id: record[0],
    interestRate: record[2],
    balance: record[3],
    principal: record[4],
    initialTimestamp: new Date(record[5].toNumber() * 1000),
    lastTimestamp: new Date(record[6].toNumber() * 1000),
    withdrawals: []
});

export default class MoneyMarket extends ethers.Contract {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, require("@alice-finance/money-market/abis/MoneyMarket.json"), signerOrProvider);
    }

    /**
     * Decimals that were used to calculate interest rate.
     * If decimals are 18, you need to divide each value of interest rate in MoneyMarket by 10^18.
     */
    public DECIMALS(): Promise<ethers.utils.BigNumber> {
        return this.functions.DECIMALS();
    }

    /**
     * Multiplier that were used to calculate interest rate.
     * If multiplier is 10^18, you need to divide each value of interest rate in MoneyMarket by 10^18.
     */
    public MULTIPLIER(): Promise<ethers.utils.BigNumber> {
        return this.functions.MULTIPLIER();
    }

    /**
     * Address of ERC20 asset used for savings.
     */
    public asset(): Promise<string> {
        return this.functions.asset();
    }

    /**
     * Address of loan contract.
     */
    public loan(): Promise<string> {
        return this.functions.loan();
    }

    /**
     * Address of savings interest calculator.
     */
    public savingsCalculator(): Promise<string> {
        return this.functions.savingsCalculator();
    }

    /**
     * Total amount of savings.
     */
    public totalFunds(): Promise<ethers.utils.BigNumber> {
        return this.functions.totalFunds();
    }

    /**
     * Total amount of loan.
     */
    public totalBorrows(): Promise<ethers.utils.BigNumber> {
        return this.functions.totalBorrows();
    }

    /**
     * Deposit an amount of asset to start savings.
     *
     * @param amount Amount of asset to save
     * @param overrides Options for transaction
     */
    public deposit(
        amount: ethers.utils.BigNumber,
        overrides?: ethers.providers.TransactionRequest
    ): Promise<ethers.providers.TransactionResponse> {
        return this.functions.deposit(amount, { ...overrides, gasLimit: 0 });
    }

    /**
     * Withdraw an amount of asset from existing savings.
     * The amount must be smaller than or equal to the total amount that has been deposited to `recordId`
     *
     * @param recordId Record ID of previously deposited savings
     * @param amount Amount of asset to withdraw
     * @param overrides Options for transaction
     */
    public withdraw(
        recordId: ethers.utils.BigNumber,
        amount: ethers.utils.BigNumber,
        overrides?: ethers.providers.TransactionRequest
    ): Promise<ethers.providers.TransactionResponse> {
        return this.functions.withdraw(recordId, amount, { ...overrides, gasLimit: 0 });
    }

    /**
     * Get savings record ids as an array of specific `user`.
     *
     * @param user Address
     */
    public getSavingsRecordIds(user: string): Promise<ethers.utils.BigNumber[]> {
        return this.functions.getSavingsRecordIds(user);
    }

    /**
     * Get savings records as an array of specific `user`.
     *
     * @param user Address
     */
    public getSavingsRecords(user: string): Promise<SavingsRecord[]> {
        return this.functions.getSavingsRecords(user).then(records => records.map(toSavingsRecord));
    }

    /**
     * Get savings record of specific `recordId`.
     *
     * @param recordId
     */
    public getSavingsRecord(recordId: string): Promise<SavingsRecord> {
        return this.functions.getSavingsRecord(recordId).then(toSavingsRecord);
    }

    /**
     * Get raw savings record ids as an array of specific `user`.
     * Raw savings record doesn't reflect the latest interest rate. It must be used for debugging.
     *
     * @param user Address
     */
    public getRawSavingsRecordIds(user: string): Promise<ethers.utils.BigNumber[]> {
        return this.functions.getRawSavingsRecordIds(user);
    }

    /**
     * Get raw savings records as an array of specific `user`.
     * Raw savings record doesn't reflect the latest interest rate. It must be used for debugging.
     *
     * @param user Address
     */
    public getRawSavingsRecords(user: string): Promise<SavingsRecord[]> {
        return this.functions.getRawSavingsRecords(user).then(records => records.map(toSavingsRecord));
    }

    /**
     * Get raw savings record of specific `recordId`.
     * Raw savings record doesn't reflect the latest interest rate. It must be used for debugging.
     *
     * @param recordId
     */
    public getRawSavingsRecord(recordId: string): Promise<any> {
        return this.functions.getRawSavingsRecord(recordId).then(toSavingsRecord);
    }

    /**
     * Get current daily savings interest rate.
     */
    public getCurrentSavingsInterestRate(): Promise<ethers.utils.BigNumber> {
        return this.functions.getCurrentSavingsInterestRate();
    }

    /**
     * Get current yearly savings interest rate.
     */
    public getCurrentSavingsAPR(): Promise<ethers.utils.BigNumber> {
        return this.functions.getCurrentSavingsAPR();
    }

    /**
     * Get expected daily savings interest rate when `amount` is deposited.
     *
     * @param amount
     */
    public getExpectedSavingsInterestRate(amount: ethers.utils.BigNumber): Promise<ethers.utils.BigNumber> {
        return this.functions.getExpectedSavingsInterestRate(amount);
    }

    /**
     * Get expected yearly savings interest rate when `amount` is deposited.
     *
     * @param amount
     */
    public getExpectedSavingsAPR(amount: ethers.utils.BigNumber): Promise<ethers.utils.BigNumber> {
        return this.functions.getExpectedSavingsAPR(amount);
    }
}
