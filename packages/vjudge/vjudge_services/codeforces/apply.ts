import * as syncList from "./syncList.ts";
import * as syncOne from "./syncOne.ts";
import * as submit from "./submit.ts";

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
    };
};