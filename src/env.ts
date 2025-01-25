import {
    Value,
    ValueUnthinkable,
} from "./value";

export class Env {
    constructor(
        public bindings: Array<{ name: string, value: Value }>,
        public outerEnv: Env | null,
    ) {
    }
}

export const emptyEnv = new Env([], null);

// Extends the environment with a single binding
export function extendEnv(env: Env, name: string, value: Value): Env {
    return new Env([{ name, value }], env);
}

export function envLookup(env: Env | null, name: string): Value {
    while (env !== null) {
        let index = env.bindings.findIndex((b) => b.name === name);
        if (index !== -1) {
            let value = env.bindings[index].value;
            if (value instanceof ValueUnthinkable) {
                throw new Error(
                    "Precondition failed: unthinkable value looked up"
                );
            }
            return value;
        }
        env = env.outerEnv;
    }
    throw new Error(`Precondition failed: no such variable '${name}'`);
}

// A combination of envLookup and extendEnv, in that it finds an existing
// binding, and overwrites its value. This is not a good thing to do in
// general, but we only use it once, to "tie the knot" in a `label`
// construct. We don't need to go all CESK just to do that; instead we
// surgically replace that one binding after evaluating the value (using
// an environment which already had the binding, but set to an unthinkable
// value).
export function recklesslyClobberBinding(
    env: Env | null,
    name: string,
    value: Value,
): void {
    while (env !== null) {
        let index = env.bindings.findIndex((b) => b.name === name);
        if (index !== -1) {
            let oldValue = env.bindings[index].value;
            if (!(oldValue instanceof ValueUnthinkable)) {
                throw new Error(
                    "Precondition failed: clobbered value is thinkable"
                );
            }
            env.bindings[index].value = value;
            return;
        }
        env = env.outerEnv;
    }
    throw new Error("Precondition failed: no such variable");
}

