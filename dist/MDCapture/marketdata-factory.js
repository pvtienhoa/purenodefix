"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var repo_1 = require("jspurefix/dist/types/FIX4.4/repo");
var jspurefix_1 = require("jspurefix");
var MarketDataFactory = (function () {
    function MarketDataFactory() {
    }
    MarketDataFactory.createMarketDataRequest = function (requestId, msgType, symbol, updateType) {
        if (msgType === void 0) { msgType = repo_1.SubscriptionRequestType.SnapshotAndUpdates; }
        if (updateType === void 0) { updateType = null; }
        var instruments = {
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
    };
    MarketDataFactory.createSecurityListRequest = function (requestId, msgType) {
        if (msgType === void 0) { msgType = repo_1.SecurityListRequestType.Symbol; }
        return {
            SecurityReqID: requestId,
            SecurityListRequestType: msgType
        };
    };
    MarketDataFactory.createTestRequest = function (requestId) {
        return {
            TestReqID: requestId
        };
    };
    MarketDataFactory.createMassQuoteAcknowledgement = function (quoteId) {
        return {
            QuoteID: quoteId
        };
    };
    MarketDataFactory.parseLiveQuotes = function (msgType, msgView) {
        try {
            switch (msgType) {
                case jspurefix_1.MsgType.MarketDataSnapshotFullRefresh: {
                    var md = msgView.toObject();
                    var b = (md.MDFullGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Bid; })) ? md.MDFullGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Bid; }).MDEntryPx : 0;
                    var a = (md.MDFullGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Offer; })) ? md.MDFullGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Offer; }).MDEntryPx : 0;
                    var lq = {
                        timeStamp: md.StandardHeader.SendingTime,
                        symbol: md.Instrument.Symbol,
                        bid: b,
                        ask: a
                    };
                    return [lq];
                }
                case jspurefix_1.MsgType.MarketDataIncrementalRefresh: {
                    var md = msgView.toObject();
                    var b = (md.MDIncGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Bid; })) ? md.MDIncGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Bid; }).MDEntryPx : 0;
                    var a = (md.MDIncGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Offer; })) ? md.MDIncGrp.find(function (g) { return g.MDEntryType === repo_1.MDEntryType.Offer; }).MDEntryPx : 0;
                    var lq = {
                        timeStamp: md.StandardHeader.SendingTime,
                        symbol: md.MDIncGrp[0].Instrument.Symbol,
                        bid: b,
                        ask: a
                    };
                    return [lq];
                }
                case jspurefix_1.MsgType.MassQuote: {
                    var mq_1 = msgView.toObject();
                    var quoteSets = mq_1.QuotSetGrp;
                    var lqs = quoteSets.map(function (q) {
                        var lq = {
                            timeStamp: mq_1.StandardHeader.SendingTime,
                            reqID: q.QuoteSetID,
                            bid: q.QuotEntryGrp.find(function (e) { return e.QuoteEntryID == '0'; }).BidSpotRate ? q.QuotEntryGrp.find(function (e) { return e.QuoteEntryID == '0'; }).BidSpotRate : -1,
                            ask: q.QuotEntryGrp.find(function (e) { return e.QuoteEntryID == '0'; }).OfferSpotRate ? q.QuotEntryGrp.find(function (e) { return e.QuoteEntryID == '0'; }).OfferSpotRate : -1
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
    };
    return MarketDataFactory;
}());
exports.MarketDataFactory = MarketDataFactory;
