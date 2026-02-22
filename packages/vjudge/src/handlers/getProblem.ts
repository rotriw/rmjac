import { Problem } from "@rmjac/api-declare";


const handleCodeforces = async (url: string): Promise<Problem> => {
    const s: Problem = {
        name: "",
        description: {
            content: "",
            description_type: "Html",
        },
        iden: "",
        limit: {
            time_limit: 1000,
            memory_limit: 256,
        },
        platform: "codeforces",
        difficulty: {
            NumberStyle: 0,
        },
    };
}



const handle = async ({ url }: { url: string}): Promise<Problem> => {
    if (url.startsWith("https://")) {
        url = url.slice(8);
    }
    if (url.startsWith("http://")) {
        url = url.slice(7);
    }
    if (url.startsWith("codeforces.com")) {
        return await handleCodeforces(url);
    }
}


export async function apply() {
    socket.on("get_problem", handle)

}