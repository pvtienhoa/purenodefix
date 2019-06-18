"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("jspurefix/dist/types/FIX4.4/repo");
const jspurefix_1 = require("jspurefix");
const common_1 = require("./common");
class MarketDataFactory {
    static createMarketDataRequest(requestId, msgType = repo_1.SubscriptionRequestType.SnapshotAndUpdates, symbol, updateType = null) {
        let instruments = {
            Instrument: {
                Symbol: symbol
            }
        };
        return {
            SubscriptionRequestType: msgType,
            MDReqID: requestId,
            MarketDepth: 0,
            InstrmtMDReqGrp: [instruments],
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
    static createMassQuoteAcknowledgement(quoteId) {
        return {
            QuoteID: quoteId
        };
    }
    static parseLiveQuotes(msgType, msgView) {
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
                    return [lq];
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
                    return [lq];
                }
                case jspurefix_1.MsgType.MassQuote: {
                    const mq = msgView.toObject();
                    console.log(common_1.Common.objToString(mq));
                    const quoteSets = mq.QuotSetGrp;
                    const lqs = quoteSets.map(q => {
                        let lq = {
                            timeStamp: mq.StandardHeader.SendingTime,
                            reqID: q.QuoteSetID,
                            bid: q.QuotEntryGrp.find(e => e.QuoteEntryID == '0').BidPx ? q.QuotEntryGrp.find(e => e.QuoteEntryID == '0').BidPx : -1,
                            ask: q.QuotEntryGrp.find(e => e.QuoteEntryID == '0').OfferPx ? q.QuotEntryGrp.find(e => e.QuoteEntryID == '0').OfferPx : -1
                        };
                        return lq;
                    });
                    return lqs;
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