import * as syncList from "./syncList.ts";
import * as syncOne from "./syncOne.ts";
import * as submit from "./submit.ts";
import * as verify from "./verify.ts";

export const apply = () => {
    if (!global.taskHandlerMap) {
        global.taskHandlerMap = {};
    }
    global.taskHandlerMap["codeforces"] = {
        "syncListapikey": syncList.apikey,
        "syncOnetoken": syncOne.token,
        "syncOnepassword": syncOne.password,
        "syncOneapikey": syncOne.apikey,
        "submittoken": submit.submit,
        "verifyapikey": verify.apikey,
        "verifypassword": verify.password,
    };
};