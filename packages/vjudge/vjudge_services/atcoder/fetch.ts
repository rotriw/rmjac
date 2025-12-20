import axios from "axios";
import { parse } from "./parse.ts";

export const fetchProblem = async (task: any) => {
    const { url } = task;
    try {
        const response = await axios.get(url);
        if (response.status !== 200) {
            return "";
        }
        return await parse(response.data, url);
    } catch (e) {
        console.error(`Error fetching ${url}:`, e);
        return "";
    }
}