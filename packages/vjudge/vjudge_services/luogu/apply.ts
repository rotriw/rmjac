import * as syncList from "./syncList.ts";
import * as syncOne from "./syncOne.ts";
import * as submit from "./submit.ts";
import * as verify from "./verify.ts";

export const apply = () => {
    if (!global.taskHandlerMap) {
        global.taskHandlerMap = {};
    }
    global.taskHandlerMap["luogu"] = {
        "syncListtoken": syncList.token,
        "syncListpassword": syncList.password,
        "syncListonly": syncList.only,
        "syncOnetoken": syncOne.token,
        "syncOnepassword": syncOne.password,
        "syncOneonly": syncOne.only,
        "submittoken": submit.submit,
        "verifytoken": verify.token,
        "verifypassword": verify.password,
        "verifyonly": verify.only,
    };
};
