import * as syncList from "./syncList.ts";
import * as syncOne from "./syncOne.ts";
import * as submit from "./submit.ts";
import * as verify from "./verify.ts";

export const apply = () => {
    if (!global.taskHandlerMap) {
        global.taskHandlerMap = {};
    }
    global.taskHandlerMap["atcoder"] = {
        "syncListpassword": syncList.password,
        "syncOnepassword": syncOne.password,
        "submittoken": submit.submit,
        "verifytoken": verify.token,
        "verifypassword": verify.password,
        "verifyonly": verify.only,
        "syncOnetoken": syncOne.token,
        "syncListtoken": syncList.token,
        "syncListonly": syncList.only,
        "syncOneonly": syncOne.only,
    };
};