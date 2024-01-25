import * as prims from "./prims";
import {
    Value,
    ValueBuiltinFunction,
    ValueEmptyList,
    ValuePair,
    ValueSymbol,
} from "./value";

export class Runtime {
    runBuiltin(fn: ValueBuiltinFunction, args: Array<Value>): Value {
        if (fn === prims.atom) {
            let [value] = args;
            let notAnAtom = value instanceof ValueSymbol ||
                value instanceof ValueEmptyList;
            return notAnAtom
                ? new ValueSymbol("t")
                : new ValueEmptyList();
        }
        else if (fn === prims.car) {
            let [value] = args;
            if (!(value instanceof ValuePair)) {
                throw new Error("Can't 'car' on a non-pair");
            }
            return value.car;
        }
        else if (fn === prims.cdr) {
            let [value] = args;
            if (!(value instanceof ValuePair)) {
                throw new Error("Can't 'cdr' on a non-pair");
            }
            return value.cdr;
        }
        else if (fn === prims.cons) {
            let [car, cdr] = args;
            return new ValuePair(car, cdr);
        }
        else if (fn === prims.eq) {
            let [x, y] = args;
            let isSameSymbol = x instanceof ValueSymbol &&
                y instanceof ValueSymbol && x.name === y.name;
            let isSameEmptyList = x instanceof ValueEmptyList &&
                y instanceof ValueEmptyList;
            return isSameSymbol || isSameEmptyList
                ? new ValueSymbol("t")
                : new ValueEmptyList();
        }
        else {
            throw new Error(`Unknown primitive: ${fn.name}`);
        }
    }
}

