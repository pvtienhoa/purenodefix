"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const util = require("util");
var SubscriptionRequestType;
(function (SubscriptionRequestType) {
})(SubscriptionRequestType = exports.SubscriptionRequestType || (exports.SubscriptionRequestType = {}));
class Common {
    static getTimeStamp(timeStamp, formatStr = 'YYYYMMDD-hh:mm:ss.SSS') {
        if (timeStamp)
            return moment(timeStamp, formatStr).format("YYYYMMDDhhmmssSSS");
        else
            return moment().utc().format("YYYYMMDDhhmmssSSS");
    }
    static roundToFixed(num, scale = 5) {
        if (!("" + num).includes("e")) {
            return +(Math.round(+(num + "e+" + scale)) + "e-" + scale);
        }
        else {
            var arr = ("" + num).split("e");
            var sig = "";
            if (+arr[1] + scale > 0) {
                sig = "+";
            }
            return +(Math.round(+(+arr[0] + "e" + sig + (+arr[1] + scale))) + "e-" + scale);
        }
    }
    static loadAppConfig(path) {
        return require(path);
    }
    static makeFConfig(appConfig) {
        return {
            "application": {
                "reconnectSeconds": 10,
                "type": "initiator",
                "name": appConfig.FBrokerName,
                "tcp": {
                    "host": appConfig.FHost,
                    "port": appConfig.FPort
                },
                "protocol": "ascii",
                "dictionary": "repo44"
            },
            "Username": appConfig.FUserName,
            "Password": appConfig.FPassword,
            "EncryptMethod": 0,
            "ResetSeqNumFlag": true,
            "HeartBtInt": 30,
            "SenderCompId": appConfig.FSenderID,
            "TargetCompID": appConfig.FTargetID,
            "BeginString": appConfig.FMsgType
        };
    }
    static delay(p) {
        return new Promise((accept) => {
            if (!p) {
                accept();
            }
            setTimeout(() => {
                accept();
            }, p);
        });
    }
    static objToString(obj) {
        return util.inspect(obj, false, null, true);
    }
}
exports.Common = Common;
//# sourceMappingURL=common.js.map