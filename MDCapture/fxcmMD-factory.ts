import {
    IInstrument,
    IMarketDataRequest,
    IMarketDataSnapshotFullRefresh,
    IMarketDataIncrementalRefresh,
    ISecurityListRequest,
    ITestRequest,
    IMarketDataRequestNoRelatedSym
} from 'jspurefix/dist/types/FIXFXCM/quickfix'
import { MsgView, MsgType } from 'jspurefix';
import { Common } from './common';

export interface ILiveQuotes {
    TimeStamp: Date;
    Symbol: string;
    BrokerName: string;
    Bid: number;
    Ask: number;
    Spread: number;
    SpreadAvg?: number;
    fpoint?: number;
}

export interface IAvegareSpread {
    TimeStamp: Date;
    Symbol: string;
    BrokerName: string;
    Duration: number;
    AvgSpread: number;
}

export class MarketDataFactory {

    /**
     * createMarketDataRequest
     */
    public static createMarketDataRequest(requestId: string, msgType: string = '1', symbols: string[]): IMarketDataRequest {
        let instruments = symbols.map(s => {
            let i :IInstrument = { Symbol: s}
            let g :IMarketDataRequestNoRelatedSym = {Instrument: i}
            return g
         })
        return {
            SubscriptionRequestType: msgType,
            MDReqID: requestId,
            MarketDepth: 0,
            MDUpdateType: 1,
            NoRelatedSym: [{
                Instrument: {Symbol: "EUR/USD"}
            }],
            NoMDEntryTypes: [
                {
                    MDEntryType: "0"
                },
                {
                    MDEntryType: "1"
                }
            ]
        } as IMarketDataRequest;
    }

    public static createSecurityListRequest(requestId: string, msgType: number = 0): ISecurityListRequest {
        return {
            SecurityReqID: requestId,
            SecurityListRequestType: msgType
        } as ISecurityListRequest
    }

    public static createTestRequest(requestId: string) :ITestRequest {
        return {
            TestReqID: requestId
        } as ITestRequest
    }

    /**
     * parseLiveQuote
     */
    public static parseLiveQuote(msgType: string, msgView: MsgView): ILiveQuotes {
        switch (msgType) {
            case MsgType.MarketDataSnapshotFullRefresh: {
                // create an object and cast to the interface
                const md: IMarketDataSnapshotFullRefresh = msgView.toObject()
                const b = (md.NoMDEntries.find(g => g.MDEntryType === "0")) ? md.NoMDEntries.find(g => g.MDEntryType === "0").MDEntryPx : 0
                const a = (md.NoMDEntries.find(g => g.MDEntryType === "1")) ? md.NoMDEntries.find(g => g.MDEntryType === "1").MDEntryPx : 0

                let lq: ILiveQuotes = {
                    TimeStamp: null,
                    Symbol: md.Instrument.Symbol,
                    BrokerName: md.MDReqID,
                    Bid: b,
                    Ask: a,
                    Spread: a - b,
                    SpreadAvg: 0,
                    fpoint: 5
                }
                return lq
            }

            case MsgType.MarketDataIncrementalRefresh: {
                const md: IMarketDataIncrementalRefresh = msgView.toObject()
                const b = (md.NoMDEntries.find(g => g.MDEntryType === "0")) ? md.NoMDEntries.find(g => g.MDEntryType === "0").MDEntryPx : 0
                const a = (md.NoMDEntries.find(g => g.MDEntryType === "1")) ? md.NoMDEntries.find(g => g.MDEntryType === "1").MDEntryPx : 0

                let lq: ILiveQuotes = {
                    TimeStamp: null,
                    Symbol: md.NoMDEntries[0].Instrument.Symbol,
                    BrokerName: 'nBroker',
                    Bid: b,
                    Ask: a,
                    Spread: a - b,
                    SpreadAvg: 0
                }
                return lq
            }
            default: {
                return undefined;
            }
        }
    }

}
