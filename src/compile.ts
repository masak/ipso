import {
    Expr,
    ExprList,
    ExprSymbol,
} from "./expr";
import {
    assertFunctionOfNParams,
    Value,
    ValueBuiltinFunction,
    ValueEmptyList,
    ValueFunction,
    ValuePair,
    ValueSymbol,
    ValueUnthinkable,
} from "./value";
import * as prims from "./prims";
import * as forms from "./forms";
import {
    Env,
    envLookup,
    extendEnv,
    recklesslyClobberBinding,
} from "./env";
import {
    Kont,
    KontApp1,
    KontApp2,
    KontCond,
    KontLabel,
    KontRetValue,
    KontSucceed,
    RetKont,
} from "./kont";
import {
    Runtime,
} from "./run";
import {
    load,
    PState,
    State,
    unload,
} from "./state";
import {
    zip,
} from "./zip";

function quoteExpr(expr: Expr, runtime: Runtime): Value {
    if (expr instanceof ExprSymbol) {
        return runtime.makeSymbol(expr.name);
    }
    else if (expr instanceof ExprList) {
        let elements = expr.elements;
        if (elements.length === 0) {
            return runtime.makeEmptyList();
        }
        else {
            let head = quoteExpr(elements[0], runtime);
            let tail = quoteExpr(new ExprList(elements.slice(1)), runtime);
            return runtime.runBuiltin(prims.cons, [head, tail]);
        }
    }
    else {
        let _coverageCheck: never = expr;
        return _coverageCheck;
    }
}

function reduceOne(state: State, runtime: Runtime): State {
    if (state instanceof PState) {
        return reducePState(state);
    }
    else {
        return reduceRetKont(state, runtime);
    }
}

function assertOperandCount(
    name: string,
    operands: Array<Expr>,
    min: number,
    max: number,
): void {
    if (operands.length < min) {
        throw new Error(operands.length === 0
            ? `'${name}' without operand`
            : `'${name}' with too few operands`);
    }
    else if (operands.length > max) {
        throw new Error(`'${name}' with too many operands`);
    }
}

function reducePState(state: PState): State {
    let expr = state.expr;
    if (expr instanceof ExprSymbol) {
        let env = state.env;
        let value = envLookup(env, expr.name);
        let kont = state.kont;
        return new KontRetValue(value, kont);
    }
    else if (expr instanceof ExprList) {
        let elements = expr.elements;
        if (elements.length === 0) {
            throw new Error("Empty combination");
        }
        else {
            let operator = elements[0];
            let operands = elements.slice(1);
            return new PState(
                operator,
                state.env,
                new KontApp1(
                    operands,
                    state.env,
                    state.kont,
                ),
            );
        }
    }
    else {
        let _coverageCheck: never = expr;
        return _coverageCheck;
    }
}

function nextArgOrCall(
    fn: ValueFunction | ValueBuiltinFunction,
    argValues: Array<Value>,
    args: Array<Expr>,
    env: Env,
    tail: Kont,
    runtime: Runtime,
): State {
    let i = argValues.length;
    if (i === args.length) {
        if (fn instanceof ValueFunction) {
            let params = fn.params;
            let bodyEnv = fn.env;
            if (typeof params === "string") {
                let paramName = params;
                let argConsList = argValues.reduceRight(
                    (cdr, car) => new ValuePair(car, cdr),
                    new ValueEmptyList(),
                );
                bodyEnv = extendEnv(bodyEnv, paramName, argConsList);
            }
            else {  // array
                for (let [paramName, arg] of zip(params, argValues)) {
                    bodyEnv = extendEnv(bodyEnv, paramName, arg);
                }
            }
            return new PState(fn.body, bodyEnv, tail);
        }
        else {  // ValueBuiltinFunction
            let result = runtime.runBuiltin(fn, argValues);
            return new KontRetValue(result, tail);
        }
    }
    else {  // at least one more argument to evaluate
        return new PState(
            args[i],
            env,
            new KontApp2(fn, argValues, args, env, tail),
        );
    }
}

function reduceRetKont(retKont: RetKont, runtime: Runtime): State {
    let value = retKont.value;
    let kont = retKont.tail;
    if (kont instanceof KontApp1) {
        if (value === forms.cond) {
            assertOperandCount("cond", kont.args, 1, Infinity);
            let pairOperands: Array<[Expr, Expr]> = [];
            for (let operand of kont.args) {
                if (!(operand instanceof ExprList)) {
                    throw new Error(
                        "Malformed 'cond': operands must be lists"
                    );
                }
                let es = operand.elements;
                if (es.length !== 2) {
                    throw new Error(
                        "Malformed 'cond': operand lists must be of length 2"
                    );
                }
                pairOperands.push([es[0], es[1]]);
            }
            return new PState(
                pairOperands[0][0],
                kont.env,
                new KontCond(
                    pairOperands[0][1],
                    kont.env,
                    pairOperands.slice(1),
                    kont.tail,
                ),
            );
        }
        else if (value === forms.label) {
            assertOperandCount("label", kont.args, 2, 2);
            let labelSymbol = kont.args[0];
            if (!(labelSymbol instanceof ExprSymbol)) {
                throw new Error(`First operand to 'label' must be a symbol`);
            }
            let labelName = labelSymbol.name;
            let extendedEnv = extendEnv(
                kont.env,
                labelName,
                new ValueUnthinkable(),
            );
            return new PState(
                kont.args[1],
                extendedEnv,
                new KontLabel(labelName, extendedEnv, kont.tail),
            );
        }
        else if (value === forms.lambda) {
            assertOperandCount("lambda", kont.args, 2, 2);
            let params = [];
            let paramsOperand = kont.args[0];
            if (!(paramsOperand instanceof ExprList)) {
                throw new Error(
                    `Malformed 'lambda': first operand must be parameter list`
                );
            }
            for (let paramExpr of paramsOperand.elements) {
                if (!(paramExpr instanceof ExprSymbol)) {
                    throw new Error(
                        `Malformed 'lambda' parameter: must be symbol`
                    );
                }
                params.push(paramExpr.name);
            }
            let body = kont.args[1];
            let value = runtime.makeFunction(kont.env, params, body);
            return new KontRetValue(value, kont.tail);
        }
        else if (value === forms.quote) {
            assertOperandCount("quote", kont.args, 1, 1);
            let value = quoteExpr(kont.args[0], runtime);
            return new KontRetValue(value, kont.tail);
        }
        else {
            assertFunctionOfNParams(value, kont.args.length);
            return nextArgOrCall(
                value,
                [],
                kont.args,
                kont.env,
                kont.tail,
                runtime,
            );
        }
    }
    else if (kont instanceof KontApp2) {
        // sad Schlemiel :(
        let argValues = [...kont.argValues, value];
        return nextArgOrCall(
            kont.fn,
            argValues,
            kont.args,
            kont.env,
            kont.tail,
            runtime,
        );
    }
    else if (kont instanceof KontCond) {
        let conditionIsTrue = value instanceof ValueSymbol &&
            value.name === "t";
        if (conditionIsTrue) {
            return new PState(kont.consequent, kont.env, kont.tail);
        }
        else {
            let pairOperands = kont.operands;
            if (pairOperands.length === 0) {
                throw new Error(
                    "Fell off the end of 'cond', not meant to do that"
                );
            }
            return new PState(
                pairOperands[0][0],
                kont.env,
                new KontCond(
                    pairOperands[0][1],
                    kont.env,
                    pairOperands.slice(1),
                    kont.tail,
                ),
            );
        }
    }
    else if (kont instanceof KontLabel) {
        // What morally justifies being reckless here is that we know
        // we arrived at `value` without ever looking at the bound value
        // in the extended environment. (If we did, we would have gotten
        // an error from envLookup.) We clobber the binding to have
        // the new value; it's as if it always had that value (in an
        // impossible, time-travel kind of way). 
        recklesslyClobberBinding(kont.env, kont.name, value);
        return new KontRetValue(value, kont.tail);
    }
    else if (kont instanceof KontSucceed) {
        throw new Error("Precondition broken: succeed within ret");
    }
    else {
        let _coverageCheck: never = kont;
        return _coverageCheck;
    }
}

function reduceFully(state: State, runtime: Runtime): Value {
    while (state instanceof PState ||
        !(state.tail instanceof KontSucceed)) {

        state = reduceOne(state, runtime);
    }
    return unload(state);
}

export function evaluate(expr: Expr): Value {
    let state = load(expr);
    let runtime = new Runtime();
    let value = reduceFully(state, runtime);
    return value;
}

