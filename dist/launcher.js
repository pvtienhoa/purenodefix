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
const path = require("path");
const jspurefix_1 = require("jspurefix");
const common_1 = require("./MDCapture/common");
const logFactory = new jspurefix_1.JsFixWinstonLogFactory(jspurefix_1.WinstonLogger.consoleOptions('info'));
class Launcher {
    constructor(appConfig) {
        this.logger = logFactory.logger('launcher');
        var root = __dirname;
        const init = path.join(root, appConfig);
        this.logger.info(`init = ${init}`);
        this.appConfig = require(init);
    }
    run() {
        return new Promise((accept, reject) => {
            const logger = this.logger;
            logger.info('launching ..');
            this.setup().then(() => {
                logger.info('.. done');
                accept();
            }).catch((e) => {
                logger.error(e);
                reject(e);
            });
        });
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            const clientDescription = common_1.Common.makeFConfig(this.appConfig);
            const clientConfig = yield jspurefix_1.makeConfig(clientDescription, logFactory, new jspurefix_1.SessionMsgFactory(clientDescription));
            this.logger.info('create initiator');
            this.logger.info('launching ....');
            var failedAttemp = 0;
            while (failedAttemp < this.appConfig.FMaxFailAttempNo) {
                try {
                    var client = yield this.getInitiator(clientConfig);
                    failedAttemp = 0;
                    this.logger.warning(`Connection Stopped, try reconnecting after 10 sec...`);
                }
                catch (error) {
                    this.logger.warning(`Connect error, try reconnecting after 10 sec ... attemp: ${failedAttemp}/${this.appConfig.FMaxFailAttempNo}`);
                    failedAttemp++;
                }
                finally {
                    yield common_1.Common.delay(10000);
                }
            }
            return client;
        });
    }
}
exports.Launcher = Launcher;
//# sourceMappingURL=launcher.js.map