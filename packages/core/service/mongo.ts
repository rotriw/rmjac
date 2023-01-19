import {connect, set as moSet} from "mongoose";
export async function apply() {
    moSet('strictQuery', true);
    await connect(global.RMJ.config.mongo);
}
