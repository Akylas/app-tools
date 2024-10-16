export function groupBy<T>(items: readonly T[], keyGetter: (item: T) => string) {
    const result = {};
    items.forEach((item) => {
        const key = keyGetter(item);
        result[key] = item;
    });
    return result;
}
export function groupByArray<T>(items: T[], keyGetter: (item: T) => string[]) {
    const result = {};
    items.forEach((item) => {
        const keys = keyGetter(item) || ['none'];
        keys.forEach((key) => {
            const collection = result[key];
            if (!collection) {
                result[key] = [item];
            } else {
                collection.push(item);
            }
        });
    });
    return result;
}