import {
    ValueBuiltinFunction,
    ValueEmptyList,
    ValuePair,
    ValueSymbol,
} from "./value";

const atom = new ValueBuiltinFunction(
    "atom",
    1,
    ([value]) =>
        value instanceof ValueSymbol || value instanceof ValueEmptyList
            ? new ValueSymbol("t")
            : new ValueEmptyList(),
);

const car = new ValueBuiltinFunction(
    "car",
    1,
    ([value]) => {
        if (!(value instanceof ValuePair)) {
            throw new Error("Can't 'car' on a non-pair");
        }
        return value.car;
    },
);

const cdr = new ValueBuiltinFunction(
    "cdr",
    1,
    ([value]) => {
        if (!(value instanceof ValuePair)) {
            throw new Error("Can't 'cdr' on a non-pair");
        }
        return value.cdr;
    },
);

const cons = new ValueBuiltinFunction(
    "cons",
    2,
    ([car, cdr]) => new ValuePair(car, cdr),
);

const eq = new ValueBuiltinFunction(
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

export {
    atom,
    cons,
    car,
    cdr,
    eq,
};

