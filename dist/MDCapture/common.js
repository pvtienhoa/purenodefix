"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
var util = require("util");
var SubscriptionRequestType;
(function (SubscriptionRequestType) {
})(SubscriptionRequestType = exports.SubscriptionRequestType || (exports.SubscriptionRequestType = {}));
var Common = (function () {
    function Common() {
    }
    Common.getTimeStamp = function (timeStamp, formatStr) {
        if (formatStr === void 0) { formatStr = 'YYYYMMDD-hh:mm:ss.SSS'; }
        if (timeStamp)
            return moment(timeStamp, formatStr).format("YYYYMMDDhhmmssSSS");
        else
            return moment().utc().format("YYYYMMDDhhmmssSSS");
    };
    Common.roundToFixed = function (num, scale) {
        if (scale === void 0) { scale = 5; }
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
    };
    Common.loadAppConfig = function (path) {
        return require(path);
    };
    Common.makeFConfig = function (appConfig) {
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
    };
    Common.delay = function (p) {
        return new Promise(function (accept) {
            if (!p) {
                accept();
            }
            setTimeout(function () {
                accept();
            }, p);
        });
    };
    Common.objToString = function (obj) {
        return util.inspect(obj, false, null, true);
    };
    Common.startInteval = function (fnc, ms) {
        return setInterval(fnc, ms);
    };
    return Common;
}());
exports.Common = Common;
