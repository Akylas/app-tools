export type RowPosition = 'first' | 'middle' | 'last' | 'only';

interface PositionedItem {
    position?: RowPosition;
}

export function getRowPosition(first: boolean, last: boolean): RowPosition {
    return first && last ? 'only' : first ? 'first' : last ? 'last' : 'middle';
}

/**
 * gives each row its place in its run of rows of the same group, returns the indexes that changed.
 * `getGroup` returns the group of an item, or undefined when it is not a row (a header...), which ends the run.
 * `from` and `to` limit the check to the rows around an insertion or a removal.
 */
export function updateRowPositions<T extends PositionedItem>(getItem: (index: number) => T | undefined, length: number, getGroup: (item?: T) => unknown, from = 0, to = length - 1) {
    const changed: number[] = [];
    for (let index = Math.max(0, from); index <= Math.min(length - 1, to); index++) {
        const item = getItem(index);
        const group = getGroup(item);
        if (!group) {
            continue;
        }
        // no getItem(-1): some arrays (an ObservableArray) read it as the last item
        const first = (index === 0 ? undefined : getGroup(getItem(index - 1))) !== group;
        const last = getGroup(getItem(index + 1)) !== group;
        const position = getRowPosition(first, last);
        if (item.position !== position) {
            item.position = position;
            changed.push(index);
        }
    }
    return changed;
}
