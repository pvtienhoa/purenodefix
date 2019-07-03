"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment-timezone");
const util = require("util");
var SubscriptionRequestType;
(function (SubscriptionRequestType) {
})(SubscriptionRequestType = exports.SubscriptionRequestType || (exports.SubscriptionRequestType = {}));
class Common {
    static getTimeStamp(timeZone, timeStamp, formatStr = 'YYYYMMDD-HH:mm:ss.SSS') {
        if (timeStamp)
            return moment(timeStamp, formatStr).tz(timeZone).format("YYYYMMDDHHmmssSSS");
        else
            return moment().tz(timeZone).format("YYYYMMDDHHmmssSSS");
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
                "name": appConfig.Broker,
                "tcp": {
                    "host": appConfig.Host,
                    "port": appConfig.Port
                },
                "protocol": "ascii",
                "dictionary": "repo44"
            },
            "Username": appConfig.UserName,
            "Password": appConfig.Password,
            "EncryptMethod": 0,
            "ResetSeqNumFlag": true,
            "HeartBtInt": 30,
            "SenderCompId": appConfig.SenderID,
            "TargetCompID": appConfig.TargetID,
            "BeginString": appConfig.MsgType
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
    static startInterval(fn, ms) {
        return setInterval(fn, ms);
    }
}
exports.Common = Common;
//# sourceMappingURL=common.js.map