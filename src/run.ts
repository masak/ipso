import {
    AbstractValue,
} from "./abstract-value";
import {
    Env,
    envLookup,
} from "./env";
import {
    Expr,
} from "./expr";
import {
    Instr,
    InstrBuiltin,
    InstrEmptyList,
    InstrFunction,
    InstrLabel,
    InstrLookup,
    InstrSymbol,
} from "./instr";
import * as prims from "./prims";
import {
    Value,
    ValueBuiltinFunction,
    ValueEmptyList,
    ValueFunction,
    ValuePair,
    ValueSymbol,
} from "./value";

export class Runtime {
    abstractValueCounter = 0;
    instrs: Array<Instr> = [];
    values = new Map<number, Value>();

    private abstractValue() {
        return new AbstractValue(this.abstractValueCounter++);
    }

    private getValues(avals: Array<AbstractValue>): Array<Value> {
        return avals.map((aval) => {
            let id = aval.id;
            let value = this.values.get(id);
            if (value === undefined) {
                throw new Error(`Abstract value ${id} not found`);
            }
            return value;
        });
    }

    private setValue(aval: AbstractValue, val: Value) {
        this.values.set(aval.id, val);
    }

    latestAbstractValue() {
        return new AbstractValue(this.abstractValueCounter - 1);
    }

    latestValue(): Value {
        if (this.values.size === 0) {
            throw new Error("Precondition failed: no values");
        }
        return this.values.get(this.abstractValueCounter - 1)!;
    }

    runBuiltin(fn: ValueBuiltinFunction, args: Array<AbstractValue>) {
        let result = this.abstractValue();
        this.instrs.push(new InstrBuiltin(fn, args, result));
        return result;
    }

    makeEmptyList() {
        let result = this.abstractValue();
        this.instrs.push(new InstrEmptyList(result));
        return result;
    }

    makeFunction(env: Env, params: Array<string>, body: Expr) {
        let result = this.abstractValue();
        this.instrs.push(new InstrFunction(env, params, body, result));
        return result;
    }

    makeSymbol(name: string) {
        let result = this.abstractValue();
        this.instrs.push(new InstrSymbol(name, result));
        return result;
    }

    makeLabel(value: Value) {
        let result = this.abstractValue();
        this.instrs.push(new InstrLabel(value, result));
        return result;
    }

    lookupVariable(env: Env, name: string) {
        let result = this.abstractValue();
        this.instrs.push(new InstrLookup(env, name, result));
        return result;
    }

    executePlan(): Value {
        let result: Value | undefined;
        for (let instr of this.instrs) {
            if (instr instanceof InstrBuiltin) {
                let fn = instr.fn;
                let args: Array<Value> = this.getValues(instr.args);
                if (fn === prims.atom) {
                    let [value] = args;
                    let notAnAtom = value instanceof ValueSymbol ||
                        value instanceof ValueEmptyList;
                    result = notAnAtom
                        ? new ValueSymbol("t")
                        : new ValueEmptyList();
                }
                else if (fn === prims.car) {
                    let [value] = args;
                    if (!(value instanceof ValuePair)) {
                        throw new Error(
                            "Can't 'car' on a non-pair: " +
                            value.constructor.name
                        );
                    }
                    result = value.car;
                }
                else if (fn === prims.cdr) {
                    let [value] = args;
                    if (!(value instanceof ValuePair)) {
                        throw new Error(
                            "Can't 'cdr' on a non-pair: " +
                            value.constructor.name
                        );
                    }
                    result = value.cdr;
                }
                else if (fn === prims.cons) {
                    let [car, cdr] = args;
                    result = new ValuePair(car, cdr);
                }
                else if (fn === prims.eq) {
                    let [x, y] = args;
                    let isSameSymbol = x instanceof ValueSymbol &&
                        y instanceof ValueSymbol && x.name === y.name;
                    let isSameEmptyList = x instanceof ValueEmptyList &&
                        y instanceof ValueEmptyList;
                    result = isSameSymbol || isSameEmptyList
                        ? new ValueSymbol("t")
                        : new ValueEmptyList();
                }
                else {
                    throw new Error(`Unknown primitive: ${fn.name}`);
                }
            }
            else if (instr instanceof InstrEmptyList) {
                result = new ValueEmptyList();
            }
            else if (instr instanceof InstrFunction) {
                let { env, params, body } = instr;
                result = new ValueFunction(env, params, body);
            }
            else if (instr instanceof InstrLabel) {
                let value = instr.value;
                result = value;
            }
            else if (instr instanceof InstrLookup) {
                let { env, name } = instr;
                result = envLookup(env, name);
            }
            else if (instr instanceof InstrSymbol) {
                let name = instr.name;
                result = new ValueSymbol(name);
            }
            else {
                let _coverageCheck: never = instr;
                return _coverageCheck;
            }
            this.setValue(instr.result, result);
        }
        this.instrs = [];
        if (result === undefined) {
            throw new Error("Precondition failed: no instructions");
        }
        return result;
    }

    executeAndGetValues(avals: Array<AbstractValue>): Array<Value> {
        if (avals.length > 0) {
            this.executePlan();
        }
        return this.getValues(avals);
    }
}

