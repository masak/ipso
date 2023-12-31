export function zip<T, U>(ts: Array<T>, us: Array<U>): Array<[T, U]> {
    let result: Array<[T, U]> = [];
    for (let i = 0; i < Math.min(ts.length, us.length); i++) {
        result.push([ts[i], us[i]]);
    }
    return result;
}

