import {
    Expr,
} from "./expr";
import {
    Env,
} from "./env";

export type Value =
    | ValueBuiltinFunction
    | ValueEmptyList
    | ValueFunction
    | ValuePair
    | ValueSpecialForm
    | ValueSymbol
    | ValueUnthinkable;

export class ValueBuiltinFunction {
    constructor(
        public name: string,
        public paramCount: number,
        public body: (args: Array<Value>) => Value,
    ) {
    }

    toString(): string {
        return `<builtin ${name}>`;
    }
}

export class ValueEmptyList {
    toString(): string {
        return "()";
    }
}

export class ValueFunction {
    constructor(
        public env: Env,
        public params: Array<string> | string,
        public body: Expr,
    ) {
    }

    toString(): string {
        return `<lambda>`;
    }
}

export class ValuePair {
    constructor(public car: Value, public cdr: Value) {
    }

    toString(): string {
        return `(${this.car.toString()} . ${this.cdr.toString()})`;
    }
}

export class ValueSpecialForm {
    constructor(public name: string) {
    }

    toString(): string {
        return `<form ${this.name}>`;
    }
}

export class ValueSymbol {
    constructor(public name: string) {
    }

    toString(): string {
        return this.name;
    }
}

export class ValueUnthinkable {
    toString(): string {
        return `<unthinkable>`;
    }
}

export function assertFunctionOfNParams(
    value: Value,
    n: number,
): asserts value is ValueFunction | ValueBuiltinFunction {
    if (value instanceof ValueFunction) {
        let params = value.params;
        if (typeof params !== "string" && params.length !== n) {
            throw new Error(
                `Function expected ${value.params.length} arguments,` +
                ` called with ${n}`
            );
        }
    }
    else if (value instanceof ValueBuiltinFunction) {
        if (value.paramCount !== n) {
            throw new Error(
                `Built-in function '${value.name}' expected ` +
                `${value.paramCount} arguments,` +
                ` called with ${n}`
            );
        }
    }
    else {
        throw new Error(`Can't apply a ${value.constructor.name}`);
    }
}

