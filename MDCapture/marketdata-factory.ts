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
    IInstrmtMDReqGrp
} from 'jspurefix/dist/types/FIX4.4/repo'
import { MsgView, MsgType } from 'jspurefix';
import { lchmod } from 'fs';
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
     * marketDataRequest
     */
    public static createMarketDataRequest(requestId: string, msgType: SubscriptionRequestType = SubscriptionRequestType.SnapshotAndUpdates, symbols: string[]): IMarketDataRequest {
        let instruments = symbols.map(s => {
            let i :IInstrument = { Symbol: s}
            let g :IInstrmtMDReqGrp = {Instrument: i}
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

    /**
     * parseLiveQuote
     */
    public static parseLiveQuote(msgType: string, msgView: MsgView): ILiveQuotes {
        switch (msgType) {
            case MsgType.MarketDataSnapshotFullRefresh: {
                // create an object and cast to the interface
                const md: IMarketDataSnapshotFullRefresh = msgView.toObject()
                const b = (md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Bid)) ? md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Bid).MDEntryPx : 0
                const a = (md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Offer)) ? md.MDFullGrp.find(g => g.MDEntryType === MDEntryType.Offer).MDEntryPx : 0

                let lq: ILiveQuotes = {
                    TimeStamp: md.StandardHeader.SendingTime,
                    Symbol: md.Instrument.Symbol,
                    BrokerName: 'nBroker',
                    Bid: b,
                    Ask: a,
                    Spread: Common.roundToFixed(a - b,5),
                    SpreadAvg: 0,
                    fpoint: 5
                }
                return lq
            }

            case MsgType.MarketDataIncrementalRefresh: {
                const md: IMarketDataIncrementalRefresh = msgView.toObject()
                const b = (md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Bid)) ? md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Bid).MDEntryPx : 0
                const a = (md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Offer)) ? md.MDIncGrp.find(g => g.MDEntryType === MDEntryType.Offer).MDEntryPx : 0

                let lq: ILiveQuotes = {
                    TimeStamp: md.StandardHeader.SendingTime,
                    Symbol: md.MDIncGrp[0].Instrument.Symbol,
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
