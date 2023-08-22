export interface EventProblemCore {
    psid: string; // problem/{psid}
    hint: string;
}

// Core use / compress verison / for db.
export interface EventTaskCore {
    title: string;
    id: string;
    description: string;
    list: EventProblemCore[];
}