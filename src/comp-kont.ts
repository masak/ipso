import {
    AbstractValue,
} from "./abstract-value";
import {
    ValueBuiltinFunction,
    ValueFunction,
} from "./value";
import {
    Expr,
} from "./expr";
import {
    Env,
} from "./env";

export type Kont = PKont | RetKont;

export type PKont =
    | KontApp1
    | KontApp2
    | KontCond
    | KontLabel
    | KontSucceed;

export type RetKont =
    | KontRet;

export class KontApp1 {
    constructor(
        public args: Array<Expr>,
        public env: Env,
        public tail: Kont,
    ) {
    }
}

export class KontApp2 {
    constructor(
        public fn: ValueFunction | ValueBuiltinFunction,
        public argValues: Array<AbstractValue>,
        public args: Array<Expr>,
        public env: Env,
        public tail: Kont,
    ) {
    }
}

export class KontCond {
    constructor(
        public consequent: Expr,
        public env: Env,
        public operands: Array<[Expr, Expr]>,
        public tail: Kont,
    ) {
    }
}

export class KontLabel {
    constructor(public name: string, public env: Env, public tail: Kont) {
    }
}

export class KontSucceed {
}

export class KontRet {
    constructor(
        public tail: PKont,
    ) {
    }
}

