"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jspurefix_1 = require("jspurefix");
class MarketDataFactory {
    static createMarketDataRequest(requestId, msgType = '1', symbols) {
        let instruments = symbols.map(s => {
            let i = { Symbol: s };
            let g = { Instrument: i };
            return g;
        });
        return {
            SubscriptionRequestType: msgType,
            MDReqID: requestId,
            MarketDepth: 0,
            MDUpdateType: 1,
            NoRelatedSym: [{
                    Instrument: { Symbol: "EUR/USD" }
                }],
            NoMDEntryTypes: [
                {
                    MDEntryType: "0"
                },
                {
                    MDEntryType: "1"
                }
            ]
        };
    }
    static createSecurityListRequest(requestId, msgType = 0) {
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
        switch (msgType) {
            case jspurefix_1.MsgType.MarketDataSnapshotFullRefresh: {
                const md = msgView.toObject();
                const b = (md.NoMDEntries.find(g => g.MDEntryType === "0")) ? md.NoMDEntries.find(g => g.MDEntryType === "0").MDEntryPx : 0;
                const a = (md.NoMDEntries.find(g => g.MDEntryType === "1")) ? md.NoMDEntries.find(g => g.MDEntryType === "1").MDEntryPx : 0;
                let lq = {
                    TimeStamp: null,
                    Symbol: md.Instrument.Symbol,
                    BrokerName: md.MDReqID,
                    Bid: b,
                    Ask: a,
                    Spread: a - b,
                    SpreadAvg: 0,
                    fpoint: 5
                };
                return lq;
            }
            case jspurefix_1.MsgType.MarketDataIncrementalRefresh: {
                const md = msgView.toObject();
                const b = (md.NoMDEntries.find(g => g.MDEntryType === "0")) ? md.NoMDEntries.find(g => g.MDEntryType === "0").MDEntryPx : 0;
                const a = (md.NoMDEntries.find(g => g.MDEntryType === "1")) ? md.NoMDEntries.find(g => g.MDEntryType === "1").MDEntryPx : 0;
                let lq = {
                    TimeStamp: null,
                    Symbol: md.NoMDEntries[0].Instrument.Symbol,
                    BrokerName: 'nBroker',
                    Bid: b,
                    Ask: a,
                    Spread: a - b,
                    SpreadAvg: 0
                };
                return lq;
            }
            default: {
                return undefined;
            }
        }
    }
}
exports.MarketDataFactory = MarketDataFactory;
//# sourceMappingURL=fxcmMD-factory.js.map