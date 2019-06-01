import { Common } from "./common";

export class AvgSpread {
    readonly timeStamp: Date;
    readonly symbol: string;
    readonly brokerName: string;
    readonly duration: number;
    public avgSpread: number;
    private sum: number
    private count: number
    public lastAvg: number
    private fpoint: number
    constructor(brokerName: string, symbol: string, fpoint: number = 5) {
        this.brokerName = brokerName;
        this.symbol = symbol;
        this.sum = 0.0;
        this.count = 0;
        this.avgSpread = 0.0;
        this.lastAvg = 0.0
        this.fpoint = fpoint;
    }    
    reset() {
        this.sum = 0.0;
        this.count = 0;
    };
    calculate() {
        if (this.count === 0) return;
        this.avgSpread = Common.roundToFixed(this.sum / this.count,this.fpoint);
    };
    addSum(s: number) {
        this.sum += s;
        this.count ++;
    }
}