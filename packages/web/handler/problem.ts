import { Handler, Route } from '../';

class ProblemPageHandler extends Handler {
}

export function apply() {
    Route('ProblemPage', '/problem/:id', ProblemPageHandler);
}