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
        public params: Array<string>,
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

export const BIF_ATOM = new ValueBuiltinFunction(
    "atom",
    1,
    ([value]) =>
        value instanceof ValueSymbol || value instanceof ValueEmptyList
            ? new ValueSymbol("t")
            : new ValueEmptyList(),
);
export const BIF_CAR = new ValueBuiltinFunction(
    "car",
    1,
    ([value]) => {
        if (!(value instanceof ValuePair)) {
            throw new Error("Can't 'car' on a non-pair");
        }
        return value.car;
    },
);
export const BIF_CDR = new ValueBuiltinFunction(
    "cdr",
    1,
    ([value]) => {
        if (!(value instanceof ValuePair)) {
            throw new Error("Can't 'cdr' on a non-pair");
        }
        return value.cdr;
    },
);
export const FORM_COND = new ValueSpecialForm("cond");
export const BIF_CONS = new ValueBuiltinFunction(
    "cons",
    2,
    ([car, cdr]) => new ValuePair(car, cdr),
);
export const BIF_EQ = new ValueBuiltinFunction(
    "eq",
    2,
    ([x, y]) => {
        let isSameSymbol = x instanceof ValueSymbol &&
            y instanceof ValueSymbol && x.name === y.name;
        let isSameEmptyList = x instanceof ValueEmptyList &&
            y instanceof ValueEmptyList;
        return isSameSymbol || isSameEmptyList
            ? new ValueSymbol("t")
            : new ValueEmptyList();
    },
);
export const FORM_LABEL = new ValueSpecialForm("label");
export const FORM_LAMBDA = new ValueSpecialForm("lambda");
export const FORM_QUOTE = new ValueSpecialForm("quote");

function parseToValue(input: string): Value {
    let worklist: Array<Array<Value>> = [[]];
    let pos = 0;
    while (pos < input.length) {
        let suffix = input.substring(pos);
        let m = suffix.match(TOKENIZER);
        if (m === null) {
            let frag = suffix.substring(0, 5);
            throw new Error(`Failed to match at position ${pos}: '${frag}'`);
        }
        let token = m[0];
        let posAfter = pos + token.length;
        let wsMatch = token.match(ALL_WHITESPACE);
        let lastIndex = worklist.length - 1;
        if (wsMatch !== null) {
            // skip silently
        }
        else if (token === "(") {
            worklist.push([]);
        }
        else if (token === ")") {
            if (worklist.length <= 1) { // off-by-one: index 0 is top level
                throw new Error(`Found ')' without '(' at pos ${pos}`);
            }
            let elements = worklist.pop()!; // we checked that it exists
            let valueList = new ValueEmptyList();
            for (let i = elements.length - 1; i >= 0; i--) {
                valueList = new ValuePair(elements[i], valueList);
            }
            lastIndex = worklist.length - 1;
            worklist[lastIndex].push(valueList);
        }
        else if (token === "'") {
            throw new Error("Quote (') not allowed in values");
        }
        else {  // it's a symbol; catch-all case
            let valueSymbol = new ValueSymbol(token);
            worklist[lastIndex].push(valueSymbol);
        }
        pos = posAfter;
        // Rough reasoning that this loop terminates: each matched token has
        // a positive length. Unless we thrown an error, we always add that
        // length to `pos`. We're upper-bounded on the input length.
    }
    if (worklist.length > 1) {
        throw new Error(`Missing ')' at end of input`);
    }
    let loneValue = worklist[0];
    if (loneValue.length === 0) {
        throw new Error("Empty input");
    }
    else if (loneValue.length > 1) {
        throw new Error("Two terms in a row at top level");
    }
    return loneValue[0];
}

export type Expr =
    | ExprSymbol
    | ExprList;

export class ExprSymbol {
    constructor(public name: string) {
    }

    toString(): string {
        return this.name;
    }
}

export class ExprList {
    constructor(public elements: Array<Expr>) {
    }

    toString(): string {
        return "(" + this.elements.map(e => e.toString()).join("") + ")";
    }
}

function maybeWrapInQuote(expr: Expr, shouldWrap: boolean): Expr {
    return shouldWrap
        ? new ExprList([new ExprSymbol("quote"), expr])
        : expr;
}

const TOKENIZER = /^(?:\s+|\(|\)|'|[\p{Letter}\p{Number}+\-*\/]+)/u;
const ALL_WHITESPACE = /^\s+$/;

function parseToExpr(input: string): Expr {
    let worklist: Array<Array<Expr>> = [[]];
    // invariant: worklist.length === shouldQuoteStack.length
    let shouldQuoteStack: Array<boolean> = [false];
    let pos = 0;
    let previousWasQuote = false;
    while (pos < input.length) {
        let suffix = input.substring(pos);
        let m = suffix.match(TOKENIZER);
        if (m === null) {
            let frag = suffix.substring(0, 5);
            throw new Error(`Failed to match at position ${pos}: '${frag}'`);
        }
        let token = m[0];
        let posAfter = pos + token.length;
        let wsMatch = token.match(ALL_WHITESPACE);
        let lastIndex = worklist.length - 1;
        let currentIsQuote = false;
        if (wsMatch !== null) {
            // skip silently
        }
        else if (token === "(") {
            worklist.push([]);
            shouldQuoteStack.push(previousWasQuote);
        }
        else if (token === ")") {
            if (previousWasQuote) {
                throw new Error(`Quote followed by ')' at ${pos}`);
            }
            if (worklist.length <= 1) { // off-by-one: index 0 is top level
                throw new Error(`Found ')' without '(' at pos ${pos}`);
            }
            let elements = worklist.pop()!; // we checked that it exists
            let wrap = shouldQuoteStack.pop()!;  // ditto, via invariant
            let exprList = new ExprList(elements);
            lastIndex = worklist.length - 1;
            let newElement = maybeWrapInQuote(exprList, wrap);
            worklist[lastIndex].push(newElement);
        }
        else if (token === "'") {
            currentIsQuote = true;
        }
        else {  // it's a symbol; catch-all case
            let exprSymbol = new ExprSymbol(token);
            let newElement = maybeWrapInQuote(exprSymbol, previousWasQuote);
            worklist[lastIndex].push(newElement);
        }
        pos = posAfter;
        previousWasQuote = currentIsQuote;
        // Rough reasoning that this loop terminates: each matched token has
        // a positive length. Unless we thrown an error, we always add that
        // length to `pos`. We're upper-bounded on the input length.
    }
    if (worklist.length > 1) {
        throw new Error(`Missing ')' at end of input`);
    }
    let loneExpr = worklist[0];
    if (loneExpr.length === 0) {
        throw new Error("Empty input");
    }
    else if (loneExpr.length > 1) {
        throw new Error("Two terms in a row at top level");
    }
    return loneExpr[0];
}

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

export const standardEnv = (() => {
    let env = standardEnvBindings.reduce(
        (env, [name, value]) => extendEnv(env, name, value),
        emptyEnv,
    );
    env = extendEnv(
        env,
        "cadr",
        new ValueFunction(
            env,
            ["x"],
            new ExprList([
                new ExprSymbol("car"),
                new ExprList([
                    new ExprSymbol("cdr"),
                    new ExprSymbol("x"),
                ]),
            ]),
        ),
    );
    return env;
})();

export type Kont = PKont | RetKont;

export type PKont =
    | KontApp1
    | KontApp2
    | KontCond
    | KontLabel
    | KontSucceed;

export type RetKont =
    | KontRetValue;

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
        public argValues: Array<Value>,
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

export class KontRetValue {
    constructor(
        public value: Value,
        public tail: PKont,
    ) {
    }
}

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

function zip<T, U>(ts: Array<T>, us: Array<U>): Array<[T, U]> {
    let result: Array<[T, U]> = [];
    for (let i = 0; i < Math.min(ts.length, us.length); i++) {
        result.push([ts[i], us[i]]);
    }
    return result;
}

function load(expr: Expr): State {
    return new PState(expr, standardEnv, new KontSucceed());
}

function unload(state: RetState): Value {
    return state.kont.value;
}

function quoteExpr(expr: Expr): Value {
    if (expr instanceof ExprSymbol) {
        return new ValueSymbol(expr.name);
    }
    else if (expr instanceof ExprList) {
        let elements = expr.elements;
        if (elements.length === 0) {
            return new ValueEmptyList();
        }
        else {
            let head = quoteExpr(elements[0]);
            let tail = quoteExpr(new ExprList(elements.slice(1)));
            return new ValuePair(head, tail);
        }
    }
    else {
        let _coverageCheck: never = expr;
        return _coverageCheck;
    }
}

function reduceOne(state: State): State {
    if (state instanceof PState) {
        return reducePState(state);
    }
    else {
        return reduceRetState(state);
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
        return new RetState(new KontRetValue(value, kont));
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

function assertFunctionOfNParams(
    value: Value,
    n: number,
): asserts value is ValueFunction | ValueBuiltinFunction {
    if (value instanceof ValueFunction) {
        if (value.params.length !== n) {
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

function nextArgOrCall(
    fn: ValueFunction | ValueBuiltinFunction,
    argValues: Array<Value>,
    args: Array<Expr>,
    env: Env,
    tail: Kont,
): State {
    let i = argValues.length;
    if (i === args.length) {
        if (fn instanceof ValueFunction) {
            let bodyEnv = fn.env;
            for (let [paramName, arg] of zip(fn.params, argValues)) {
                bodyEnv = extendEnv(bodyEnv, paramName, arg);
            }
            return new PState(fn.body, bodyEnv, tail);
        }
        else {  // ValueBuiltinFunction
            let result = fn.body(argValues);
            return new RetState(new KontRetValue(result, tail));
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

function reduceRetState(state: RetState): State {
    let retKont = state.kont;
    let value = retKont.value;
    let kont = retKont.tail;
    if (kont instanceof KontApp1) {
        if (value === FORM_COND) {
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
        else if (value === FORM_LABEL) {
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
        else if (value === FORM_LAMBDA) {
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
            let value = new ValueFunction(kont.env, params, body);
            return new RetState(new KontRetValue(value, kont.tail));
        }
        else if (value === FORM_QUOTE) {
            assertOperandCount("quote", kont.args, 1, 1);
            let value = quoteExpr(kont.args[0]);
            return new RetState(new KontRetValue(value, kont.tail));
        }
        else {
            assertFunctionOfNParams(value, kont.args.length);
            return nextArgOrCall(
                value,
                [],
                kont.args,
                kont.env,
                kont.tail,
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
        // we arrived at `value` without ever looking at the binding
        // in the extended environment. (If we did, we would have gotten
        // an error from envLookup.) We clobber the binding to have
        // the intended binding; it's as if it always had that binding
        // (in an impossible, time-travel kind of way). 
        recklesslyClobberBinding(kont.env, kont.name, value);
        return new RetState(new KontRetValue(value, kont.tail));
    }
    else if (kont instanceof KontSucceed) {
        throw new Error("Precondition broken: succeed within ret");
    }
    else {
        let _coverageCheck: never = kont;
        return _coverageCheck;
    }
}

export function reduceFully(state: State): Value {
    while (state instanceof PState ||
        !(state.kont.tail instanceof KontSucceed)) {

        state = reduceOne(state);
    }
    return unload(state);
}

export function evaluate(expr: Expr): Value {
    let state = load(expr);
    let value = reduceFully(state);
    return value;
}

function isDeeply(expected: Value, actual: Value): boolean {
    if (expected instanceof ValueSymbol && actual instanceof ValueSymbol) {
        return expected.name === actual.name;
    }
    else if (expected instanceof ValuePair && actual instanceof ValuePair) {
        return isDeeply(expected.car, actual.car) &&
            isDeeply(expected.cdr, actual.cdr);
    }
    else if (expected instanceof ValueEmptyList &&
        actual instanceof ValueEmptyList) {
        return true;
    }
    else {
        return false;
    }
}

let testNumber = 0;

function is(expected: Value, actual: Value, message: string): void {
    testNumber += 1;
    let areEqual = isDeeply(expected, actual);
    let okStatus = areEqual ? "ok" : "NOT OK";
    console.log(`${okStatus} ${testNumber} - ${message}`);
    if (!areEqual) {
        console.log(`Expected: ${expected.toString()}`);
        console.log(`     Got: ${actual.toString()}`);
    }
}

{
    let expr = parseToExpr("(quote a)");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    is(expected, actual, "(quote a)");
}

{
    let expr = parseToExpr("(quote (a b c))");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    is(expected, actual, "(quote (a b c))");
}

{
    let expr = parseToExpr("(atom 'a)");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    is(expected, actual, "(atom 'a)");
}

{
    let expr = parseToExpr("(atom '(a b c))");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    is(expected, actual, "(atom '(a b c))");
}

{
    let expr = parseToExpr("(atom '())");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    is(expected, actual, "(atom '())");
}

{
    let expr = parseToExpr("(atom (atom 'a))");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    is(expected, actual, "(atom (atom 'a))");
}

{
    let expr = parseToExpr("(atom '(atom 'a))");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    is(expected, actual, "(atom '(atom 'a))");
}

{
    let expr = parseToExpr("(eq 'a 'a)");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    is(expected, actual, "(eq 'a 'a)");
}

{
    let expr = parseToExpr("(eq 'a 'b)");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    is(expected, actual, "(eq 'a 'b)");
}

{
    let expr = parseToExpr("(eq '() '())");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    is(expected, actual, "(eq '() '())");
}

{
    let expr = parseToExpr("(car '(a b c))");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    is(expected, actual, "(car '(a b c))");
}

{
    let expr = parseToExpr("(cdr '(a b c))");
    let expected = parseToValue("(b c)");
    let actual = evaluate(expr);
    is(expected, actual, "(cdr '(a b c))");
}

{
    let expr = parseToExpr("(cons 'a '(b c))");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    is(expected, actual, "(cons 'a '(b c))");
}

{
    let expr = parseToExpr("(cons 'a (cons 'b (cons 'c '())))");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    is(expected, actual, "(cons 'a (cons 'b (cons 'c '())))");
}

{
    let expr = parseToExpr("(car (cons 'a '(b c)))");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    is(expected, actual, "(car (cons 'a '(b c)))");
}

{
    let expr = parseToExpr("(cdr (cons 'a '(b c)))");
    let expected = parseToValue("(b c)");
    let actual = evaluate(expr);
    is(expected, actual, "(cdr (cons 'a '(b c)))");
}

{
    let expr = parseToExpr("(cond ((eq 'a 'b) 'first) ((atom 'a) 'second))");
    let expected = parseToValue("second");
    let actual = evaluate(expr);
    is(expected, actual, "(cond ((eq 'a 'b) 'first) ((atom 'a) 'second))");
}

{
    let expr = parseToExpr("(cond ((atom 'a) 'first) ((eq 'a 'b) 'second))");
    let expected = parseToValue("first");
    let actual = evaluate(expr);
    is(expected, actual, "(cond ((atom 'a) 'first) ((eq 'a 'b) 'second))");
}

{
    let expr = parseToExpr("(cond ((eq 'a 'b) 'huh))");
    let expected = parseToValue("exception");
    let actual = parseToValue("(no exception)");
    try {
        evaluate(expr);
    }
    catch {
        actual = parseToValue("exception");
    }
    is(expected, actual, "(cond ((eq 'a 'b) 'huh))");
}

{
    let expr = parseToExpr("((lambda (x) (cons x '(b))) 'a)");
    let expected = parseToValue("(a b)");
    let actual = evaluate(expr);
    is(expected, actual, "((lambda (x) (cons x '(b))) 'a)");
}

{
    let expr = parseToExpr("((lambda (x y) (cons x (cdr y))) 'z '(a b c))");
    let expected = parseToValue("(z b c)");
    let actual = evaluate(expr);
    is(expected, actual, "((lambda (x y) (cons x (cdr y))) 'z '(a b c))");
}

{
    let expr = parseToExpr(
        "((lambda (f) (f '(b c))) (lambda (x) (cons 'a x)))"
    );
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    is(expected, actual, "((lambda (f) (f '(b c))) (lambda (x) (cons 'a x)))");
}

{
    let expr = parseToExpr(`
        ((label subst (lambda (x y z)
           (cond ((atom z)
                  (cond ((eq z y) x)
                         ('t z)))
                 ('t (cons (subst x y (car z))
                           (subst x y (cdr z)))))))
         'm 'b '(a b (a b c) d))
    `);
    let expected = parseToValue("(a m (a m c) d)");
    let actual = evaluate(expr);
    is(expected, actual, "((label subst ...) 'm 'b ...)");
}

{
    let expr = parseToExpr("(cadr '((a b) (c d) e))");
    let expected = parseToValue("(c d)");
    let actual = evaluate(expr);
    is(expected, actual, "(cadr '((a b) (c d) e))");
}
