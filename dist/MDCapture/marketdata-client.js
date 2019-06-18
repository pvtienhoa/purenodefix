"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
                    this.eventLog.info('e:');
                    this.eventLog.info(common_1.Common.objToString(e));
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
        this.eventLog.info('Client stopped!');
        this.logger.info('Stopped!');
        this.InsertAvgSpreadCronJob.stop();
        this.InsertAvgSpreadCronJob.destroy();
        this.dailyReconnectCronJob.destroy();
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
        this.tmpTrans = this.transport;
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
                    }
                    if (this.liveQuotes && this.dbConnector && this.sessionState.state === jspurefix_1.SessionState.PeerLoggedOn) {
                        this.dbConnector.updateLiveQuotes(this.liveQuotes.values()).then((res) => {
                            if (res)
                                this.logger.info(`LiveQuotes Updated`);
                        }).catch((err) => {
                            throw err;
                        });
                    }
                    this.liveQuotes.values().forEach(lq => {
                        lq.lqFlag = false;
                        this.liveQuotes.addUpdate(lq.symbol, lq);
                    });
                }, 200);
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
        this.eventLog.info('Tring to Log on!');
        this.logger.info(`peer logs in user ${user}`);
        return true;
    }
    updateLiveQuotesTick(self) {
        console.log(`updating LiveQuotes...`);
        if (self.liveQuotes && self.dbConnector)
            self.dbConnector.updateLiveQuotes(self.liveQuotes.values());
    }
    insertAvgSpreadsTick(self) {
        self.eventLog.info(`inserting AVGSpreads...`);
        self.logger.info(`inserting AVGSpreads...`);
        if (self.liveQuotes && self.dbConnector)
            self.dbConnector.insertAvgSpreads(self.liveQuotes.values());
    }
}
exports.MarketDataClient = MarketDataClient;
//# sourceMappingURL=marketdata-client.js.map