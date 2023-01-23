import {ProblemListEvent} from "../declare/event";


export const ProblemListEventValue = {
    'view': 0,
    'problem': 1,
    'user': 2,
    'description': 3,
    'title': 4,
    'delete': 5,
};

export class ListPerm {
    PERMCheck(event :ProblemListEvent, PERMNumber :number) :boolean {
        return (((PERMNumber >> ProblemListEventValue[event]) & 1) == 1);
    }

    PERMGet(PERMNumber :number) :Array<ProblemListEvent> {
        const res = [];
        for (const q in ProblemListEventValue) {
            ((PERMNumber >> ProblemListEventValue[q]) & 1) ? res.push(q) : console.log(q);
        }
        return res;
    }

    PERMAdd(event :ProblemListEvent, OldPERMNumber :number) :number {
        if (OldPERMNumber === -1) {
            return -1;
        }
        return (OldPERMNumber | (1 << ProblemListEventValue[event]));
    }

    PERMDelete(event :ProblemListEvent, OldPERMNumber :number) :number {
        if (this.PERMCheck(event, OldPERMNumber) === false) {
            return OldPERMNumber;
        }
        return (OldPERMNumber ^ (1 << ProblemListEventValue[event]));
    }
}
