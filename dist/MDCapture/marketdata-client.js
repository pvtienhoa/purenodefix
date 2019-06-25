"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
<<<<<<< HEAD
var jspurefix_1 = require("jspurefix");
var cron = require("node-cron");
var repo_1 = require("jspurefix/dist/types/FIX4.4/repo");
var marketdata_factory_1 = require("./marketdata-factory");
var dbconnector_1 = require("./dbconnector");
var common_1 = require("./common");
var LiveQuote_1 = require("./LiveQuote");
var repo_2 = require("jspurefix/dist/types/FIX4.4/repo");
var MarketDataClient = (function (_super) {
    __extends(MarketDataClient, _super);
    function MarketDataClient(config, appConfig) {
        var _this = _super.call(this, config) || this;
        _this.config = config;
        _this.appConfig = appConfig;
        _this.logReceivedMsgs = true;
        _this.fixLog = config.logFactory.plain(_this.appConfig.FMsgType + "-" + _this.appConfig.FUserName + "-" + _this.appConfig.FSenderID + "-" + _this.appConfig.FTargetID + ".messages", 5 * 1024 * 1024 * 1024);
        _this.eventLog = config.logFactory.plain(_this.appConfig.FMsgType + "-" + _this.appConfig.FUserName + "-" + _this.appConfig.FSenderID + "-" + _this.appConfig.FTargetID + ".event", 100 * 1024 * 1024);
        _this.logger = config.logFactory.logger(_this.me + ":MDClient");
        _this.dbConnector = new dbconnector_1.DBConnector(_this.appConfig, config.logFactory);
        _this.liveQuotes = new jspurefix_1.Dictionary();
        _this.msgCount = 0;
        _this.isIdling = false;
        _this.idleDuration = 0;
        _this.InsertAvgSpreadCronJob = cron.schedule("*/" + appConfig.AvgTerm + " * * * *", function () {
            _this.logger.info("inserting AVGSpreads...");
            if (_this.liveQuotes && _this.dbConnector)
                _this.dbConnector.insertAvgSpreads(_this.liveQuotes.values());
=======
const jspurefix_1 = require("jspurefix");
const cron = require("node-cron");
const repo_1 = require("jspurefix/dist/types/FIX4.4/repo");
const marketdata_factory_1 = require("./marketdata-factory");
const dbconnector_1 = require("./dbconnector");
const common_1 = require("./common");
const LiveQuote_1 = require("./LiveQuote");
const repo_2 = require("jspurefix/dist/types/FIX4.4/repo");
const moment = require("moment");
class MarketDataClient extends jspurefix_1.AsciiSession {
    constructor(config, appConfig) {
        super(config);
        this.config = config;
        this.appConfig = appConfig;
        this.logReceivedMsgs = true;
        this.fixLog = config.logFactory.plain(`${this.appConfig.FMsgType}-${this.appConfig.FUserName}-${this.appConfig.FSenderID}-${this.appConfig.FTargetID}.messages`, 5 * 1024 * 1024 * 1024);
        this.eventLog = config.logFactory.plain(`${this.appConfig.FMsgType}-${this.appConfig.FUserName}-${this.appConfig.FSenderID}-${this.appConfig.FTargetID}.event`, 100 * 1024 * 1024);
        this.logger = config.logFactory.logger(`${this.me}:MDClient`);
        this.dbConnector = new dbconnector_1.DBConnector(this.appConfig, config.logFactory);
        this.liveQuotes = new jspurefix_1.Dictionary();
        this.msgCount = 0;
        this.isIdling = false;
        this.idleDuration = moment.duration(0);
        this.InsertAvgSpreadCronJob = cron.schedule(`*/${appConfig.AvgTerm} * * * *`, () => {
            this.logger.info(`inserting AVGSpreads...`);
            if (this.liveQuotes && this.dbConnector)
                this.dbConnector.insertAvgSpreads(this.liveQuotes.values());
>>>>>>> parent of 8a2c063... Fix average calc
        }, { scheduled: false });
        _this.dailyReconnectCronJob = cron.schedule("0 2 * * *", function () {
            _this.logger.info("Daily disconnected");
            _this.eventLog.info("Daily disconnected");
            _this.done();
        }, {
            scheduled: false,
            timezone: "Etc/UTC"
        });
        return _this;
    }
    MarketDataClient.prototype.onApplicationMsg = function (msgType, view) {
        var _this = this;
        switch (msgType) {
            case jspurefix_1.MsgType.MassQuote:
                var quoteID = view.getString(jspurefix_1.MsgTag.QuoteID);
                if (quoteID) {
                    var mqa = marketdata_factory_1.MarketDataFactory.createMassQuoteAcknowledgement(quoteID);
                    this.send(jspurefix_1.MsgType.MassQuoteAcknowledgement, mqa);
                }
            case jspurefix_1.MsgType.MarketDataSnapshotFullRefresh:
            case jspurefix_1.MsgType.MarketDataIncrementalRefresh: {
                this.msgCount++;
                var lqs = marketdata_factory_1.MarketDataFactory.parseLiveQuotes(msgType, view);
                if (!lqs.length)
                    throw new Error('no LiveQuotes from Parsed!');
<<<<<<< HEAD
                lqs.forEach(function (e) {
                    _this.eventLog.info('e:');
                    _this.eventLog.info(common_1.Common.objToString(e));
                    var lqToUpdate;
=======
                lqs.forEach(e => {
                    this.eventLog.info('e:');
                    this.eventLog.info(common_1.Common.objToString(e));
                    let lqToUpdate;
>>>>>>> parent of 8a2c063... Fix average calc
                    if (e.symbol)
                        lqToUpdate = _this.liveQuotes.get(e.symbol);
                    else
                        lqToUpdate = _this.liveQuotes.values().find(function (x) { return x.reqID === e.reqID; });
                    lqToUpdate.update(e);
                    _this.liveQuotes.addUpdate(lqToUpdate.symbol, lqToUpdate);
                });
                if (this.isIdling)
                    this.isIdling = false;
                break;
            }
            case jspurefix_1.MsgType.SecurityList: {
                this.logger.info('Security List received!');
            }
            default:
                break;
        }
    };
    MarketDataClient.prototype.onStopped = function () {
        this.eventLog.info('Client stopped!');
        this.logger.info('Stopped!');
        this.InsertAvgSpreadCronJob.stop();
        this.InsertAvgSpreadCronJob.destroy();
        this.dailyReconnectCronJob.destroy();
    };
    MarketDataClient.prototype.onDecoded = function (msgType, txt) {
        this.fixLog.info(txt);
    };
    MarketDataClient.prototype.onEncoded = function (msgType, txt) {
        this.fixLog.info(jspurefix_1.AsciiSession.asPiped(txt));
    };
    MarketDataClient.prototype.onReady = function (view) {
        var _this = this;
        this.eventLog.info('Logged on!');
        this.logger.info('ready');
        this.tmpTrans = this.transport;
        try {
            this.dbConnector.querySymbols().then(function (symbols) {
                _this.eventLog.info("Symbol list accquired, count: " + symbols.length);
                symbols.forEach(function (r) {
                    var l = new LiveQuote_1.LiveQuote(r.currencypairname, r.requestId, _this.appConfig.FBrokerName, 0, 0, r.Digit);
                    _this.liveQuotes.addUpdate(r.currencypairname, l);
                    var mdr = marketdata_factory_1.MarketDataFactory.createMarketDataRequest(l.reqID, repo_2.SubscriptionRequestType.SnapshotAndUpdates, l.symbol, repo_1.MDUpdateType.IncrementalRefresh);
                    _this.eventLog.info("Sending MDRequest to host: " + _this.appConfig.FHost + ": " + _this.appConfig.FPort);
                    _this.send(jspurefix_1.MsgType.MarketDataRequest, mdr);
                });
<<<<<<< HEAD
                _this.InsertAvgSpreadCronJob.start();
                _this.eventLog.info("Cronjob for inserting AvgSpreads Started!");
                _this.dailyReconnectCronJob.start();
                _this.eventLog.info("Cronjob for daily Reconnect Started!");
                setInterval(function () {
                    if (_this.isIdling)
                        _this.idleDuration += 200;
                    else
                        _this.idleDuration = 0;
                    _this.isIdling = true;
                    if (_this.idleDuration >= _this.appConfig.FNoMsgResetTimeout * 60 * 1000) {
                        _this.eventLog.info("Client has been idle for " + _this.appConfig.FNoMsgResetTimeout + " minutes, Reconnecting");
                        _this.logger.info("Client has been idle for " + _this.appConfig.FNoMsgResetTimeout + " minutes, Reconnecting");
                        _this.idleDuration = 0;
                        _this.done();
=======
                this.InsertAvgSpreadCronJob.start();
                this.eventLog.info(`Cronjob for inserting AvgSpreads Started!`);
                this.dailyReconnectCronJob.start();
                this.eventLog.info(`Cronjob for daily Reconnect Started!`);
                setInterval(() => {
                    if (this.isIdling)
                        this.idleDuration.add(200, 'ms');
                    else
                        this.idleDuration = moment.duration(0);
                    this.isIdling = true;
                    if (this.idleDuration.asMinutes() >= this.appConfig.FNoMsgResetTimeout) {
                        this.eventLog.info(`Client has been idle for ${this.appConfig.FNoMsgResetTimeout} minutes, Reconnecting`);
                        this.logger.info(`Client has been idle for ${this.appConfig.FNoMsgResetTimeout} minutes, Reconnecting`);
                        this.idleDuration = moment.duration(0);
                        this.done();
>>>>>>> parent of 8a2c063... Fix average calc
                    }
                    if (_this.liveQuotes && _this.dbConnector && _this.sessionState.state === jspurefix_1.SessionState.PeerLoggedOn) {
                        _this.dbConnector.updateLiveQuotes(_this.liveQuotes.values()).then(function (res) {
                            if (res)
                                _this.logger.info("LiveQuotes Updated");
                        }).catch(function (err) {
                            throw err;
                        });
                    }
                    _this.liveQuotes.values().forEach(function (lq) {
                        lq.lqFlag = false;
                        _this.liveQuotes.addUpdate(lq.symbol, lq);
                    });
                }, 200);
                _this.eventLog.info("Interval job for updating LiveQuotes Started!");
            });
        }
        catch (error) {
            this.eventLog.error(error);
            this.logger.error(error);
        }
        process.on('SIGINT', function () {
            console.log("Caught interrupt signal");
            process.exit();
        });
    };
    MarketDataClient.prototype.onLogon = function (view, user, password) {
        this.eventLog.info('Tring to Log on!');
        this.logger.info("peer logs in user " + user);
        return true;
    };
    MarketDataClient.prototype.updateLiveQuotesTick = function (self) {
        if (self.liveQuotes && self.dbConnector && self.sessionState.state === jspurefix_1.SessionState.PeerLoggedOn) {
            self.dbConnector.updateLiveQuotes(self.liveQuotes.values()).then(function (res) {
                if (res)
                    self.logger.info("LiveQuotes Updated");
            }).catch(function (err) {
                throw err;
            });
        }
    };
    MarketDataClient.prototype.insertAvgSpreadsTick = function (self) {
        if (self.liveQuotes && self.dbConnector) {
            self.dbConnector.insertAvgSpreads(self.liveQuotes.values()).then(function (res) {
                if (res) {
                    self.eventLog.info("AVGSpreads Inserted");
                    self.logger.info("AVGSpreads Inserted");
                }
            }).catch(function (err) {
                throw err;
            });
        }
    };
    MarketDataClient.prototype.stopClient = function () {
        this.done();
    };
    MarketDataClient.prototype.clientTick = function (self) {
        if (self.isIdling)
            self.idleDuration += 200;
        else
            self.idleDuration = 0;
        self.isIdling = true;
        if (self.idleDuration >= self.appConfig.FNoMsgResetTimeout * 60 * 1000) {
            self.eventLog.info("Client has been idle for " + self.appConfig.FNoMsgResetTimeout + " minutes, Reconnecting");
            self.logger.info("Client has been idle for " + self.appConfig.FNoMsgResetTimeout + " minutes, Reconnecting");
            self.done();
        }
        self.updateLiveQuotesTick(self);
        self.liveQuotes.values().forEach(function (lq) {
            lq.lqFlag = false;
            self.liveQuotes.addUpdate(lq.symbol, lq);
        });
    };
    return MarketDataClient;
}(jspurefix_1.AsciiSession));
exports.MarketDataClient = MarketDataClient;
