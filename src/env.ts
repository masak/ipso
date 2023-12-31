import {
    Value,
    ValueUnthinkable,
} from "./value";

export type Env = EnvNil | EnvCons;

class EnvNil {
}

class EnvCons {
    constructor(
        public variableName: string,
        public value: Value,
        public tail: Env,
    ) {
    }
}

export const emptyEnv = new EnvNil();

export function extendEnv(env: Env, variableName: string, value: Value): Env {
    return new EnvCons(variableName, value, env);
}

export function envLookup(env: Env, variableName: string): Value {
    while (env instanceof EnvCons) {
        if (env.variableName === variableName) {
            let value = env.value;
            if (value instanceof ValueUnthinkable) {
                throw new Error(
                    "Precondition failed: unthinkable value looked up"
                );
            }
            return value;
        }
        env = env.tail;
    }
    throw new Error(`Precondition failed: no such variable '${variableName}'`);
}

export function tryLookup(env: Env, variableName: string): boolean {
    while (env instanceof EnvCons) {
        if (env.variableName === variableName) {
            return true;
        }
        env = env.tail;
    }
    return false;
}

// A combination of envLookup and extendEnv, in that it finds an existing
// binding, and overwrites its value. This is not a good thing to do in
// general, but we only use it once, to "tie the knot" in a `label`
// construct. We don't need to go all CESK just to do that; instead we
// surgically replace that one binding after evaluating the value (using
// an environment which already had the binding, but set to an unthinkable
// value).
export function recklesslyClobberBinding(
    env: Env,
    variableName: string,
    value: Value,
): void {
    while (env instanceof EnvCons) {
        if (env.variableName === variableName) {
            if (!(env.value instanceof ValueUnthinkable)) {
                throw new Error(
                    "Precondition failed: clobbered value is thinkable"
                );
            }
            env.value = value;
            return;
        }
        env = env.tail;
    }
    throw new Error("Precondition failed: no such variable");
}

