"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jspurefix_1 = require("jspurefix");
const cron = require("node-cron");
const repo_1 = require("jspurefix/dist/types/FIX4.4/repo");
const marketdata_factory_1 = require("./marketdata-factory");
const dbconnector_1 = require("./dbconnector");
const common_1 = require("./common");
const LiveQuote_1 = require("./LiveQuote");
const repo_2 = require("jspurefix/dist/types/FIX4.4/repo");
class MarketDataClient extends jspurefix_1.AsciiSession {
    constructor(config, appConfig) {
        super(config);
        this.config = config;
        this.appConfig = appConfig;
        this.logReceivedMsgs = true;
        this.fixLog = config.logFactory.plain(`${this.appConfig.FMsgType}-${this.appConfig.FUserName}-${this.appConfig.FSenderID}-${this.appConfig.FTargetID}.messages`, 5 * 1024 * 1024 * 1024);
        this.eventLog = config.logFactory.plain(`${this.appConfig.FMsgType}-${this.appConfig.FUserName}-${this.appConfig.FSenderID}-${this.appConfig.FTargetID}.event`, 100 * 1024 * 1024, true);
        this.logger = config.logFactory.logger(`${this.me}:MDClient`);
        this.dbConnector = new dbconnector_1.DBConnector(this.appConfig, config.logFactory);
        this.liveQuotes = new jspurefix_1.Dictionary();
        this.msgCount = 0;
        this.isIdling = false;
        this.idleDuration = 0;
        this.clientTickHandler = 0;
        this.InsertAvgSpreadCronJob = cron.schedule(`*/${appConfig.AvgTerm} * * * *`, () => {
            this.insertAvgSpreadsTick();
        }, { scheduled: false });
        this.dailyReconnectCronJob = cron.schedule(`0 2 * * *`, () => {
            this.logger.info(`Daily disconnected`);
            this.eventLog.info(`Daily disconnected`);
            this.done();
        }, {
            scheduled: false,
            timezone: "Etc/UTC"
        });
    }
    onApplicationMsg(msgType, view) {
        switch (msgType) {
            case jspurefix_1.MsgType.MassQuote:
                var quoteID = view.getString(jspurefix_1.MsgTag.QuoteID);
                if (quoteID) {
                    let mqa = marketdata_factory_1.MarketDataFactory.createMassQuoteAcknowledgement(quoteID);
                    this.send(jspurefix_1.MsgType.MassQuoteAcknowledgement, mqa);
                }
            case jspurefix_1.MsgType.MarketDataSnapshotFullRefresh:
            case jspurefix_1.MsgType.MarketDataIncrementalRefresh: {
                this.msgCount++;
                let lqs = marketdata_factory_1.MarketDataFactory.parseLiveQuotes(msgType, view);
                if (!lqs.length)
                    throw new Error('no LiveQuotes from Parsed!');
                lqs.forEach(e => {
                    let lqToUpdate;
                    if (e.symbol)
                        lqToUpdate = this.liveQuotes.get(e.symbol);
                    else
                        lqToUpdate = this.liveQuotes.values().find(x => x.reqID === e.reqID);
                    lqToUpdate.update(e);
                    this.liveQuotes.addUpdate(lqToUpdate.symbol, lqToUpdate);
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
    }
    onStopped() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this.clientTickHandler);
            this.clientTickHandler = null;
            this.liveQuotes = null;
            this.InsertAvgSpreadCronJob.destroy();
            this.InsertAvgSpreadCronJob.destroy();
            this.dailyReconnectCronJob.destroy();
            this.msgCount = null;
            this.isIdling = null;
            this.idleDuration = null;
            this.dbConnector.stop();
            this.eventLog.info('Client stopped!');
            this.logger.info('Stopped!');
        });
    }
    onDecoded(msgType, txt) {
        this.fixLog.info(txt);
    }
    onEncoded(msgType, txt) {
        this.fixLog.info(jspurefix_1.AsciiSession.asPiped(txt));
    }
    onReady(view) {
        this.eventLog.info('Logged on!');
        this.logger.info('ready');
        try {
            this.dbConnector.querySymbols().then(symbols => {
                this.eventLog.info(`Symbol list accquired, count: ${symbols.length}`);
                symbols.forEach(r => {
                    let l = new LiveQuote_1.LiveQuote(r.currencypairname, r.requestId, this.appConfig.FBrokerName, 0, 0, r.Digit);
                    this.liveQuotes.addUpdate(r.currencypairname, l);
                    let mdr = marketdata_factory_1.MarketDataFactory.createMarketDataRequest(l.reqID, repo_2.SubscriptionRequestType.SnapshotAndUpdates, l.symbol, repo_1.MDUpdateType.IncrementalRefresh);
                    this.eventLog.info(`Sending MDRequest to host: ${this.appConfig.FHost}: ${this.appConfig.FPort}`);
                    this.send(jspurefix_1.MsgType.MarketDataRequest, mdr);
                });
                this.InsertAvgSpreadCronJob.start();
                this.eventLog.info(`Cronjob for inserting AvgSpreads Started!`);
                this.dailyReconnectCronJob.start();
                this.eventLog.info(`Cronjob for daily Reconnect Started!`);
                this.clientTickHandler = common_1.Common.startInterval(() => { this.clientTick(); }, 200);
                this.eventLog.info(`Interval job for updating LiveQuotes Started!`);
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
    }
    onLogon(view, user, password) {
        this.eventLog.info('Trying to Log on!');
        this.logger.info(`peer logs in user ${user}`);
        return true;
    }
    updateLiveQuotesTick() {
        if (this.liveQuotes && this.dbConnector && this.sessionState.state === jspurefix_1.SessionState.PeerLoggedOn) {
            this.dbConnector.updateLiveQuotes(this.liveQuotes.values()).then((res) => {
                if (res)
                    this.logger.info(`LiveQuotes Updated`);
            }).catch((err) => {
                throw err;
            });
        }
    }
    insertAvgSpreadsTick() {
        if (this.liveQuotes && this.dbConnector && this.sessionState.state === jspurefix_1.SessionState.PeerLoggedOn) {
            this.dbConnector.insertAvgSpreads(this.liveQuotes.values()).then((res) => {
                if (res) {
                    this.eventLog.info(`AVGSpreads Inserted`);
                    this.logger.info(`AVGSpreads Inserted`);
                }
            }).catch((err) => {
                throw err;
            });
        }
    }
    clientTick() {
        if (!this.isIdling)
            this.idleDuration += 200;
        this.isIdling = true;
        if (this.idleDuration >= this.appConfig.FNoMsgResetTimeout * 2 * 1000) {
            this.eventLog.info(`Client has been idle for ${this.appConfig.FNoMsgResetTimeout} minutes, Reconnecting`);
            this.logger.info(`Client has been idle for ${this.appConfig.FNoMsgResetTimeout} minutes, Reconnecting`);
            this.done();
        }
        this.updateLiveQuotesTick();
        this.liveQuotes.values().forEach(lq => {
            lq.lqFlag = false;
            this.liveQuotes.addUpdate(lq.symbol, lq);
        });
    }
}
exports.MarketDataClient = MarketDataClient;
//# sourceMappingURL=marketdata-client.js.map