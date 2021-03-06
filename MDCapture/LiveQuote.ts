import { Common } from "./common";

export interface ILiveQuote {
    timeStamp: Date;
    symbol?: string;
    reqID?: string;
    bid: number;
    ask: number;
    spread?: number;
    lqFlag?: boolean
}

export interface IAverageSpread {
    symbol: string;
    avgSpread: number;
    avgFlag: boolean;

    avgCalc(): void;
}

export class LiveQuote implements ILiveQuote, IAverageSpread {

    /**
     *  Constructor
     */
    constructor(
        private _symbol: string,
        private _reqID: string,
        private _brokerName: string,
        private _bid: number,
        private _ask: number,
        private _fpoint: number = 5,
        private _timeStamp: Date = null,
        private _spread: number = 0,
        private _sumSpread: number = 0,
        private _avgSpread: number = 0,
        private _spreadCount: number = 0,
        private _lqFlag: boolean = false,
        private _avgFlag: boolean = false) {

    }



    public get reqID(): string { return this._reqID; }
    public set reqID(v: string) { this._reqID = v; }

    public get timeStamp(): Date { return this._timeStamp; }
    public set timeStamp(v: Date) { this._timeStamp = v; }

    public get symbol(): string { return this._symbol; }
    public set symbol(v: string) { this._symbol = v; }

    public get brokerName(): string { return this._brokerName; }
    public set brokerName(v: string) { this._brokerName = v; }

    public get bid(): number { return this._bid; }
    public set bid(v: number) { this._bid = v; }

    public get ask(): number { return this._ask; }
    public set ask(v: number) { this._ask = v; }

    public get fpoint(): number { return this._fpoint; }
    public set fpoint(v: number) { this._fpoint = v; }

    public get spread(): number { return this._spread; }
    public set spread(v: number) { this._spread = v; }

    public get sumSpread(): number { return this._sumSpread; }
    public set sumSpread(v: number) { this._sumSpread = v; }

    public get avgSpread(): number { return this._avgSpread; }
    public set avgSpread(v: number) { this._avgSpread = v; }

    public get msgCount(): number { return this._spreadCount; }
    public set msgCount(v: number) { this._spreadCount = v; }

    public get lqFlag(): boolean { return this._lqFlag; }
    public set lqFlag(v: boolean) { this._lqFlag = v; }


    public get avgFlag(): boolean { return this._avgFlag; }
    public set avgFlag(v: boolean) { this._avgFlag = v; }




    /**
     * reset
     */
    private reset(): void {
        this._sumSpread = 0;
        this._spreadCount = 0;
        this._avgFlag = false;
    }

    /**
     * addSum
     *  - add spread to sum
     */
    private addSum() {
        if (!this._avgFlag) this._avgFlag = true;
        this._sumSpread += this._spread;
        this._spreadCount++;
    }
    /**
     * avgCalc
     */
    public avgCalc(): void {
        if (this._spreadCount) {
            this._avgSpread = this._sumSpread / this._spreadCount;
            this.reset();
        }
    }

    /**
     * spreadCalc
     */
    private spreadCalc(): boolean {
        if (this._ask && this._bid && this._fpoint) {
            this._spread = (this._ask - this._bid) * Math.pow(10, this._fpoint - 1);
            return true;
        } else {
            this._spread = 0;
            //throw new Error('Error on spreadCalc');
            return false;
        }
    }

    /**
     * update
     */
    public update(liveQuote: ILiveQuote): boolean {
        if ((liveQuote.symbol == this._symbol || liveQuote.reqID == this._reqID) && liveQuote.timeStamp && liveQuote.ask && liveQuote.bid) {
            this._timeStamp = liveQuote.timeStamp;
            this._bid = liveQuote.bid === -1 ? this._bid : liveQuote.bid;
            this._ask = liveQuote.ask === -1 ? this._ask : liveQuote.ask;
            if (this.spreadCalc()) {
                this.addSum();
                if (!this._lqFlag) this._lqFlag = true;
            }
            return true;
        }
        return false;
    }
}