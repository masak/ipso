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
} from "./comp-kont";

export type State = PState | RetKont;

export class PState {
    constructor(
        public expr: Expr,
        public env: Env,
        public kont: PKont,
    ) {
    }
}

export function load(expr: Expr): State {
    return new PState(expr, standardEnv, new KontSucceed());
}

export function unload(kont: RetKont): Value {
    return kont.value;
}

