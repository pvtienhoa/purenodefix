import {
    SubscriptionRequestType,
    MDUpdateType,
    MDEntryType,
    MDUpdateAction,
    MDReqRejReason,
    MDImplicitDelete,
    IInstrument,
    IMarketDataRequest,
    IMarketDataSnapshotFullRefresh,
    IMarketDataIncrementalRefresh,
    IMarketDataRequestReject,
    IInstrmtMDReqGrp,
    SecurityListRequestType,
    ISecurityListRequest,
    ITestRequest
} from 'jspurefix/dist/types/FIX4.4/repo'
import { MsgView, MsgType } from 'jspurefix';
import { lchmod } from 'fs';
import { Common } from './common';
import { ILiveQuote } from './LiveQuote';

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

// export interface IAvegareSpread {
//     TimeStamp: Date;
//     Symbol: string;
//     BrokerName: string;
//     Duration: number;
//     AvgSpread: number;
// }

export class MarketDataFactory {

    /**
     * createMarketDataRequest
     */
    public static createMarketDataRequest(requestId: string, msgType: SubscriptionRequestType = SubscriptionRequestType.SnapshotAndUpdates, symbols: string[]): IMarketDataRequest {
        let instruments = symbols.map(s => {
            let i: IInstrument = { Symbol: s }
            let g: IInstrmtMDReqGrp = { Instrument: i }
            return g
        })
        return {
            SubscriptionRequestType: msgType,
            MDReqID: requestId,
            MarketDepth: 0,
            MDUpdateType: MDUpdateType.IncrementalRefresh,
            InstrmtMDReqGrp: instruments,
            MDReqGrp: [
                {
                    MDEntryType: MDEntryType.Bid
                },
                {
                    MDEntryType: MDEntryType.Offer
                }
            ]
        } as IMarketDataRequest;
    }

    public static createSecurityListRequest(requestId: string, msgType: SecurityListRequestType = SecurityListRequestType.Symbol): ISecurityListRequest {
        return {
            SecurityReqID: requestId,
            SecurityListRequestType: msgType
        } as ISecurityListRequest
    }

    public static createTestRequest(requestId: string): ITestRequest {
        return {
            TestReqID: requestId
        } as ITestRequest
    }

    /**
     * parseLiveQuote
     */
    public static parseLiveQuote(msgType: string, msgView: MsgView): ILiveQuote {
        try {
            switch (msgType) {
                case MsgType.MarketDataSnapshotFullRefresh: {
                    // create an object and cast to the interface
                    const md: IMarketDataSnapshotFullRefresh = msgView.toObject()
                    const b = (md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Bid)) ? md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Bid).MDEntryPx : 0
                    const a = (md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Offer)) ? md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Offer).MDEntryPx : 0

                    let lq: ILiveQuote = {
                        timeStamp: md.StandardHeader.SendingTime,
                        symbol: md.Instrument.Symbol,
                        bid: b,
                        ask: a
                    }

                    return lq
                }

                case MsgType.MarketDataIncrementalRefresh: {
                    const md: IMarketDataIncrementalRefresh = msgView.toObject()
                    const b = (md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Bid)) ? md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Bid).MDEntryPx : 0
                    const a = (md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Offer)) ? md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Offer).MDEntryPx : 0

                    let lq: ILiveQuote = {

                        timeStamp: md.StandardHeader.SendingTime,
                        symbol: md.MDIncGrp[0].Instrument.Symbol,
                        bid: b,
                        ask: a
                    }
                    return lq
                }
                default: {
                    return undefined;
                }
            }
        } catch (error) {
            throw new Error('Error parsing LiveQuote - ' + error);
        }

    }

}
