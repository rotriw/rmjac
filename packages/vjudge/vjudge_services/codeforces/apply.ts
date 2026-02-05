import * as syncList from "./syncList.ts";
import * as syncOne from "./syncOne.ts";
import * as submit from "./submit.ts";
import * as verify from "./verify.ts";
import * as fetch from "./fetch.ts";
import * as track from "./track.ts";


export const apply = () => {
    if (!global.taskHandlerMap) {
        global.taskHandlerMap = {};
    }
    track.track_start();
    global.taskHandlerMap["codeforces"] = {
        "syncListapikey": syncList.apikey,
        "syncOnetoken": syncOne.token,
        "submittoken": submit.submit,
        "verifyapikey": verify.apikey,
        "verifytoken": verify.token,
        "fetch": fetch.any,
    };
};