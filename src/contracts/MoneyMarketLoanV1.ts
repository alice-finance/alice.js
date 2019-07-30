import { ethers } from "ethers";

import MoneyMarket from "./MoneyMarket";

export interface LoanRecord {
    id: ethers.utils.BigNumber;
    interestRate: ethers.utils.BigNumber;
    balance: ethers.utils.BigNumber;
    principal: ethers.utils.BigNumber;
    collateral: string;
    collateralAmount: ethers.utils.BigNumber;
    initialTimestamp: Date;
    lastTimestamp: Date;
    repays: LoanRepaid[];
}

export interface LoanRepaid {
    recordId: ethers.utils.BigNumber;
    amount: ethers.utils.BigNumber;
    timestamp: Date;
}

const toLoanRecord = (record: any[]) => ({
    id: record[0],
    interestRate: record[2],
    balance: record[3],
    principal: record[4],
    collateral: record[5],
    collateralAmount: record[6],
    initialTimestamp: new Date(record[7].toNumber() * 1000),
    lastTimestamp: new Date(record[8].toNumber() * 1000),
    repays: []
});

export default class MoneyMarketLoanV1 extends MoneyMarket {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, signerOrProvider);
    }

    public loanCalculator(): Promise<string> {
        return this.functions.loanCalculator();
    }

    public priceSource(): Promise<string> {
        return this.functions.priceSource();
    }

    public collateralSource(): Promise<string> {
        return this.functions.collateralSource();
    }

    public borrow(
        amount: ethers.utils.BigNumber,
        collateral: string,
        collateralAmount: ethers.utils.BigNumber,
        overrides?: ethers.providers.TransactionRequest
    ): Promise<ethers.providers.TransactionResponse> {
        return this.functions.borrow(amount, collateral, collateralAmount, { ...overrides, gasLimit: 0 });
    }

    public repay(
        recordId: ethers.utils.BigNumber,
        amount: ethers.utils.BigNumber,
        overrides?: ethers.providers.TransactionRequest
    ): Promise<ethers.providers.TransactionResponse> {
        return this.functions.repay(recordId, amount, { ...overrides, gasLimit: 0 });
    }

    public supplyCollateral(
        recordId: ethers.utils.BigNumber,
        amount: ethers.utils.BigNumber,
        overrides?: ethers.providers.TransactionRequest
    ): Promise<ethers.providers.TransactionResponse> {
        return this.functions.supplyCollateral(recordId, amount, { ...overrides, gasLimit: 0 });
    }

    public liquidateLoan(
        recordId: ethers.utils.BigNumber,
        amount: ethers.utils.BigNumber,
        overrides?: ethers.providers.TransactionRequest
    ): Promise<ethers.providers.TransactionResponse> {
        return this.functions.liquidateLoan(recordId, amount, { ...overrides, gasLimit: 0 });
    }

    /**
     * Get savings record ids as an array of specific `user`.
     *
     * @param user Address
     */
    public getLoanRecordIds(user: string): Promise<ethers.utils.BigNumber[]> {
        return this.functions.getLoanRecordIds(user);
    }

    /**
     * Get savings records as an array of specific `user`.
     *
     * @param user Address
     */
    public getLoanRecords(user: string): Promise<LoanRecord[]> {
        return this.functions.getLoanRecords(user).then(records => records.map(toLoanRecord));
    }

    /**
     * Get savings record of specific `recordId`.
     *
     * @param recordId
     */
    public getLoanRecord(recordId: string): Promise<LoanRecord> {
        return this.functions.getLoanRecord(recordId).then(toLoanRecord);
    }

    /**
     * Get raw savings record ids as an array of specific `user`.
     * Raw savings record doesn't reflect the latest interest rate. It must be used for debugging.
     *
     * @param user Address
     */
    public getRawLoanRecordIds(user: string): Promise<ethers.utils.BigNumber[]> {
        return this.functions.getRawLoanRecordIds(user);
    }

    /**
     * Get raw savings records as an array of specific `user`.
     * Raw savings record doesn't reflect the latest interest rate. It must be used for debugging.
     *
     * @param user Address
     */
    public getRawLoanRecords(user: string): Promise<LoanRecord[]> {
        return this.functions.getRawLoanRecords(user).then(records => records.map(toLoanRecord));
    }

    /**
     * Get raw savings record of specific `recordId`.
     * Raw savings record doesn't reflect the latest interest rate. It must be used for debugging.
     *
     * @param recordId
     */
    public getRawLoanRecord(recordId: string): Promise<any> {
        return this.functions.getRawLoanRecord(recordId).then(toLoanRecord);
    }

    /**
     * Get current daily savings interest rate.
     */
    public getCurrentLoanInterestRate(): Promise<ethers.utils.BigNumber> {
        return this.functions.getCurrentLoanInterestRate();
    }

    /**
     * Get current yearly savings interest rate.
     */
    public getCurrentLoanAPR(): Promise<ethers.utils.BigNumber> {
        return this.functions.getCurrentLoanAPR();
    }

    /**
     * Get expected daily savings interest rate when `amount` is deposited.
     *
     * @param amount
     */
    public getExpectedLoanInterestRate(amount: ethers.utils.BigNumber): Promise<ethers.utils.BigNumber> {
        return this.functions.getExpectedLoanInterestRate(amount);
    }

    /**
     * Get expected yearly savings interest rate when `amount` is deposited.
     *
     * @param amount
     */
    public getExpectedLoanAPR(amount: ethers.utils.BigNumber): Promise<ethers.utils.BigNumber> {
        return this.functions.getExpectedLoanAPR(amount);
    }
}
