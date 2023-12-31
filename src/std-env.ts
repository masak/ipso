import {
    emptyEnv,
    Env,
    extendEnv,
    recklesslyClobberBinding,
} from "./env";
import {
    Value,
    ValueFunction,
    ValueUnthinkable,
} from "./value";
import {
    ExprList,
    ExprSymbol,
} from "./expr";
import {
    parseToExpr,
} from "./parse-expr";
import * as prims from "./prims";
import * as forms from "./forms";
import {
    zip,
} from "./zip";

const standardEnvBindings: Array<[string, Value]> = [
    ["atom", prims.atom],
    ["car", prims.car],
    ["cdr", prims.cdr],
    ["cond", forms.cond],
    ["cons", prims.cons],
    ["eq", prims.eq],
    ["label", forms.label],
    ["lambda", forms.lambda],
    ["quote", forms.quote],
];

function makeFunction(
    env: Env,
    name: string,
    params: string,
    body: string,
): ValueFunction {
    let paramsExpr = parseToExpr(params);
    let bodyExpr = parseToExpr(body);
    let paramsArrayOrString: Array<string> | string;
    if (paramsExpr instanceof ExprList) {
        paramsArrayOrString = paramsExpr.elements.map((elem) => {
            if (!(elem instanceof ExprSymbol)) {
                throw new Error(
                    "Precondition failed: parameter must be symbol"
                );
            }
            return elem.name;
        });
    }
    else if (paramsExpr instanceof ExprSymbol) {
        paramsArrayOrString = paramsExpr.name;
    }
    else {
        throw new Error("Precondition failed: params must be list or symbol");
    }
    return new ValueFunction(env, paramsArrayOrString, bodyExpr);
}

function addFunction(
    env: Env,
    name: string,
    params: string,
    body: string,
): Env {
    let fnValue = makeFunction(env, name, params, body);
    let extendedEnv = extendEnv(env, name, fnValue);
    // Yes, we monkey-patch the environment; since this is a function no-one's
    // ever seen or invoked, it's morally OK, or at least not observably evil.
    // This is what makes `append` below work, which calls itself.
    fnValue.env = extendedEnv;
    return extendedEnv;
}

type FuncDef = [string, string, string];

function add(env: Env, funcDefs: Array<FuncDef>): Env {
    return funcDefs.reduce(
        (prevEnv, [name, params, body]) =>
            addFunction(prevEnv, name, params, body),
        env,
    );
}

// The three functions for doing evaluation, <eval evcon evlis>, are mutually
// recursive, like this (with `a ---> b` meaning that `a` invokes `b`):
//
// evlis <---> eval <---> evcon
//
// To enable this, we "tie the knot", using the same extended environment
// for all of the functions, and then clobbering the environment to
// retroactively contain the functions.
function addMutual(env: Env, funcDefs: Array<FuncDef>): Env {
    let names = funcDefs.map((fd) => fd[0]);
    let extendedEnv = names.reduce(
        (prevEnv, name) => extendEnv(prevEnv, name, new ValueUnthinkable()),
        env,
    );
    let functions = funcDefs.map(([name, params, body]) =>
        makeFunction(extendedEnv, name, params, body)
    );
    for (let [name, fn] of zip(names, functions)) {
        recklesslyClobberBinding(extendedEnv, name, fn);
    }
    return extendedEnv;
}

let standardEnv = standardEnvBindings.reduce(
    (env, [name, value]) => extendEnv(env, name, value),
    emptyEnv,
);

standardEnv = add(standardEnv, [
    ["caar", "(x)", "(car (car x))"],
    ["cadr", "(x)", "(car (cdr x))"],
    ["cdar", "(x)", "(cdr (car x))"],
    ["caddr", "(x)", "(car (cdr (cdr x)))"],
    ["cadar", "(x)", "(car (cdr (car x)))"],
    ["caddar", "(x)", "(car (cdr (cdr (car x))))"],
    ["list", "args", "args"],
    ["null", "(x)", "(eq x '())"],
    ["and", "(x y)", `
        (cond (x (cond (y 't) ('t '())))
            ('t '()))
    `],
    ["not", "(x)", `
        (cond (x '())
            ('t 't))
    `],
    ["append", "(x y)", `
        (cond ((null x) y)
            ('t (cons (car x) (append (cdr x) y))))
    `],
    ["zip", "(x y)", `
        (cond ((and (null x) (null y)) '())
            ((and (not (atom x)) (not (atom y)))
            (cons (list (car x) (car y))
                    (zip (cdr x) (cdr y)))))
    `],
    ["assoc", "(x y)", `
        (cond ((eq (caar y) x) (cadar y))
              ('t (assoc x (cdr y))))
    `],
]);

standardEnv = addMutual(standardEnv, [
    ["eval", "(e a)", `
        (cond
          ((atom e) (assoc e a))
          ((atom (car e))
           (cond
             ((eq (car e) 'quote) (cadr e))
             ((eq (car e) 'atom) (atom (eval (cadr e) a)))
             ((eq (car e) 'eq) (eq (eval (cadr e) a)
                                   (eval (caddr e) a)))
             ((eq (car e) 'car) (car (eval (cadr e) a)))
             ((eq (car e) 'cdr) (cdr (eval (cadr e) a)))
             ((eq (car e) 'cons) (cons (eval (cadr e) a)
                                       (eval (caddr e) a)))
             ((eq (car e) 'cond) (evcon (cdr e) a))
             ('t (eval (cons (assoc (car e) a)
                             (cdr e))
                       a))))
          ((eq (caar e) 'label)
           (eval (cons (caddar e) (cdr e))
                 (cons (list (cadar e) (car e)) a)))
          ((eq (caar e) 'lambda)
           (eval (caddar e)
                 (append (zip (cadar e) (evlis (cdr e) a))
                         a))))
    `],
    ["evcon", "(c a)", `
        (cond ((eval (caar c) a)
               (eval (cadar c) a))
              ('t (evcon (cdr c) a)))
    `],
    ["evlis", "(m a)", `
        (cond ((null m) '())
              ('t (cons (eval (car m) a)
                        (evlis (cdr m) a))))
    `],
]);

export {
    standardEnv,
};

