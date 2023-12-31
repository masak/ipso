import {
    Expr,
} from "./expr";
import {
    Value,
} from "./value";
import {
    Env,
} from "./env";
import {
    standardEnv,
} from "./std-env";
import {
    PKont,
    RetKont,
    KontSucceed,
} from "./kont";

export type State = PState | RetState;

export class PState {
    constructor(
        public expr: Expr,
        public env: Env,
        public kont: PKont,
    ) {
    }
}

export class RetState {
    constructor(public kont: RetKont) {
    }
}

export function load(expr: Expr): State {
    return new PState(expr, standardEnv, new KontSucceed());
}

export function unload(state: RetState): Value {
    return state.kont.value;
}

