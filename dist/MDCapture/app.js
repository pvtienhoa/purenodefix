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
const marketdata_client_1 = require("./marketdata-client");
const jspurefix_1 = require("jspurefix");
const launcher_1 = require("../launcher");
const common_1 = require("./common");
const path = require("path");
class AppNfixLauncher extends launcher_1.Launcher {
    constructor() {
        super('./../config.json');
    }
    getInitiator(config) {
        return jspurefix_1.initiator(config, c => new marketdata_client_1.MarketDataClient(c, this.appConfig), 5000);
    }
}
(() => __awaiter(this, void 0, void 0, function* () {
    var root = __dirname;
    const init = path.join(root, './../../config.json');
    const appConfig = common_1.Common.loadAppConfig(init);
    var failedAttemp = 0;
    while (failedAttemp < appConfig.FMaxFailAttempNo) {
        try {
            var l = new AppNfixLauncher();
            yield l.run();
            failedAttemp = 0;
            l = null;
            console.log('done');
        }
        catch (error) {
            console.log(error.message);
            failedAttemp++;
        }
        finally {
            yield common_1.Common.delay(60 * 1000);
        }
    }
}))();
//# sourceMappingURL=app.js.map