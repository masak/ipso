import {
    emptyEnv,
    Env,
    extendEnv,
} from "./env";
import {
    Value,
    ValueFunction,
} from "./value";
import {
    ExprList,
    ExprSymbol,
} from "./expr";
import {
    parseToExpr,
} from "./parse-expr";
import {
    BIF_ATOM,
    BIF_CAR,
    BIF_CDR,
    BIF_CONS,
    BIF_EQ,
} from "./prims";
import {
    FORM_COND,
    FORM_LABEL,
    FORM_LAMBDA,
    FORM_QUOTE,
} from "./forms";

const standardEnvBindings: Array<[string, Value]> = [
    ["atom", BIF_ATOM],
    ["car", BIF_CAR],
    ["cdr", BIF_CDR],
    ["cond", FORM_COND],
    ["cons", BIF_CONS],
    ["eq", BIF_EQ],
    ["label", FORM_LABEL],
    ["lambda", FORM_LAMBDA],
    ["quote", FORM_QUOTE],
];

function addFunction(
    env: Env,
    name: string,
    params: string,
    body: string,
): Env {
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
    let fnValue = new ValueFunction(env, paramsArrayOrString, bodyExpr);
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
        (prevEnv, [name, params, body]) => addFunction(
            prevEnv,
            name,
            params,
            body,
        ),
        env,
    );
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

export {
    standardEnv,
};

