import { Handler, Route } from '../handle';

class ProblemPageHandler extends Handler {
}

export function apply() {
    Route('ProblemPage', '/problem/:id', ProblemPageHandler);
}