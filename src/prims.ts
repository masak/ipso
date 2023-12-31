import {
    ValueBuiltinFunction,
    ValueEmptyList,
    ValuePair,
    ValueSymbol,
} from "./value";

export const BIF_ATOM = new ValueBuiltinFunction(
    "atom",
    1,
    ([value]) =>
        value instanceof ValueSymbol || value instanceof ValueEmptyList
            ? new ValueSymbol("t")
            : new ValueEmptyList(),
);

export const BIF_CAR = new ValueBuiltinFunction(
    "car",
    1,
    ([value]) => {
        if (!(value instanceof ValuePair)) {
            throw new Error("Can't 'car' on a non-pair");
        }
        return value.car;
    },
);

export const BIF_CDR = new ValueBuiltinFunction(
    "cdr",
    1,
    ([value]) => {
        if (!(value instanceof ValuePair)) {
            throw new Error("Can't 'cdr' on a non-pair");
        }
        return value.cdr;
    },
);

export const BIF_CONS = new ValueBuiltinFunction(
    "cons",
    2,
    ([car, cdr]) => new ValuePair(car, cdr),
);

export const BIF_EQ = new ValueBuiltinFunction(
    "eq",
    2,
    ([x, y]) => {
        let isSameSymbol = x instanceof ValueSymbol &&
            y instanceof ValueSymbol && x.name === y.name;
        let isSameEmptyList = x instanceof ValueEmptyList &&
            y instanceof ValueEmptyList;
        return isSameSymbol || isSameEmptyList
            ? new ValueSymbol("t")
            : new ValueEmptyList();
    },
);

