import {
    AbstractValue,
} from "./abstract-value";
import {
    Env,
} from "./env";
import {
    Expr,
} from "./expr";
import {
    Value,
    ValueBuiltinFunction,
} from "./value";

export type Instr =
    | InstrBuiltin
    | InstrEmptyList
    | InstrFunction
    | InstrLabel
    | InstrLookup
    | InstrSymbol
;

export class InstrBuiltin {
    constructor(
        public fn: ValueBuiltinFunction,
        public args: Array<AbstractValue>,
        public result: AbstractValue,
    ) {
    }
}

export class InstrEmptyList {
    constructor(public result: AbstractValue) {
    }
}

export class InstrFunction {
    constructor(
        public env: Env,
        public params: Array<string>,
        public body: Expr,
        public result: AbstractValue,
    ) {
    }
}

export class InstrLabel {
    constructor(
        public value: Value,
        public result: AbstractValue,
    ) {
    }
}

export class InstrLookup {
    constructor(
        public env: Env,
        public name: string,
        public result: AbstractValue,
    ) {
    }
}

export class InstrSymbol {
    constructor(public name: string, public result: AbstractValue) {
    }
}

