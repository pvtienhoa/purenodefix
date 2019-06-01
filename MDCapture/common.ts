import * as moment from 'moment'
import * as fs from 'fs'

export interface IAppConfig {
    BrokerName: string
    FHost: string
    FPort: number
    FSenderID: string
    FTargetID: string
    FTargetSubID: string
    FUserName: string
    FPassword: string
    FMsgType: string
    FDictPath: string
    FBrokerName: string
    DBHost: string
    DBDatabase: string
    DBUserName: string
    DBPassword: string
    DBSocketPath: string
    TblSymbols: string
    TblLiveQuotes: string
    TblAverageSpreads: string
    AvgTerm: number
}
export class Common {
    public static getTimeStamp(timeStamp?: Date, formatStr: string = 'YYYYMMDD-hh:mm:ss.SSS'): string {
        if (timeStamp) return moment(timeStamp, formatStr).format("YYYYMMDDhhmmssSSS")
        else return moment().utc().format("YYYYMMDDhhmmssSSS");
    }

    public static roundToFixed(num: number, fpoint: number = 5) : number {
        let multiply = +(num + "e+" + fpoint)
        let r = Math.round(+(multiply + "e+2"))
        return +(r + "e-" + fpoint);
    }

    public static loadAppConfig(path: string): IAppConfig {
        return require(path)
      }

    public static makeFConfig (appConfig : IAppConfig): any{
        return {
            "application": {
                "reconnectSeconds": 10,
                "type": "initiator",
                "name": appConfig.BrokerName,
                "tcp": {
                  "host" : appConfig.FHost,
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
              "TargetSubID": appConfig.FTargetSubID,
              "BeginString": appConfig.FMsgType
        }
    }
}
