"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("jspurefix/dist/types/FIX4.4/repo");
const jspurefix_1 = require("jspurefix");
class MarketDataFactory {
    static createMarketDataRequest(requestId, msgType = repo_1.SubscriptionRequestType.SnapshotAndUpdates, symbols) {
        let instruments = symbols.map(s => {
            let i = { Symbol: s };
            let g = { Instrument: i };
            return g;
        });
        return {
            SubscriptionRequestType: msgType,
            MDReqID: requestId,
            MarketDepth: 0,
            MDUpdateType: repo_1.MDUpdateType.IncrementalRefresh,
            InstrmtMDReqGrp: instruments,
            MDReqGrp: [
                {
                    MDEntryType: repo_1.MDEntryType.Bid
                },
                {
                    MDEntryType: repo_1.MDEntryType.Offer
                }
            ]
        };
    }
    static createSecurityListRequest(requestId, msgType = repo_1.SecurityListRequestType.Symbol) {
        return {
            SecurityReqID: requestId,
            SecurityListRequestType: msgType
        };
    }
    static createTestRequest(requestId) {
        return {
            TestReqID: requestId
        };
    }
    static parseLiveQuote(msgType, msgView) {
        try {
            switch (msgType) {
                case jspurefix_1.MsgType.MarketDataSnapshotFullRefresh: {
                    const md = msgView.toObject();
                    const b = (md.MDFullGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Bid)) ? md.MDFullGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Bid).MDEntryPx : 0;
                    const a = (md.MDFullGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Offer)) ? md.MDFullGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Offer).MDEntryPx : 0;
                    let lq = {
                        timeStamp: md.StandardHeader.SendingTime,
                        symbol: md.Instrument.Symbol,
                        bid: b,
                        ask: a
                    };
                    return lq;
                }
                case jspurefix_1.MsgType.MarketDataIncrementalRefresh: {
                    const md = msgView.toObject();
                    const b = (md.MDIncGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Bid)) ? md.MDIncGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Bid).MDEntryPx : 0;
                    const a = (md.MDIncGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Offer)) ? md.MDIncGrp.find(g => g.MDEntryType === repo_1.MDEntryType.Offer).MDEntryPx : 0;
                    let lq = {
                        timeStamp: md.StandardHeader.SendingTime,
                        symbol: md.MDIncGrp[0].Instrument.Symbol,
                        bid: b,
                        ask: a
                    };
                    return lq;
                }
                default: {
                    return undefined;
                }
            }
        }
        catch (error) {
            throw new Error('Error parsing LiveQuote - ' + error);
        }
    }
}
exports.MarketDataFactory = MarketDataFactory;
//# sourceMappingURL=marketdata-factory.js.map