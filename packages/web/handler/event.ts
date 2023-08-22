import { Handler, Route } from '..';

class EventPageHandler extends Handler {

}

export function apply() {
    Route('EventPage', '/event/:id', EventPageHandler);
}