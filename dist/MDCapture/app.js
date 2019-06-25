"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const marketdata_client_1 = require("./marketdata-client");
const jspurefix_1 = require("jspurefix");
const launcher_1 = require("../launcher");
class AppNfixLauncher extends launcher_1.Launcher {
    constructor() {
        super('./../config.json');
    }
    getInitiator(config) {
        return jspurefix_1.initiator(config, c => new marketdata_client_1.MarketDataClient(c, this.appConfig), 5000);
    }
}
const l = new AppNfixLauncher();
l.run().then(() => {
    console.log('finished.');
});
//# sourceMappingURL=app.js.map