import * as syncList from "./syncList.ts";
import * as syncOne from "./syncOne.ts";
import * as submit from "./submit.ts";

export const apply = () => {
    if (!global.taskHandlerMap) {
        global.taskHandlerMap = {};
    }
    global.taskHandlerMap["atcoder"] = {
        "syncListpassword": syncList.password,
        "syncOnepassword": syncOne.password,
        "submittoken": submit.submit,
    };
};