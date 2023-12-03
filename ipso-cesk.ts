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

export function emptyEnv(): Env {
    return new EnvNil();
}

export function extendEnv(env: Env, variableName: string, value: Value): Env {
    return new EnvCons(variableName, value, env);
}

export function envLookup(env: Env, variableName: string): Value {
    while (env instanceof EnvCons) {
        if (env.variableName === variableName) {
            return env.value;
        }
        env = env.tail;
    }
    throw new Error("Precondition failure: no such variable");
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

export type Value =
    | ValueSymbol
    | ValueEmptyList
    | ValuePair;

export class ValueSymbol {
    constructor(public name: string) {
    }

    toString(): string {
        return this.name;
    }
}

export class ValueEmptyList {
    toString(): string {
        return "()";
    }
}

export class ValuePair {
    constructor(public car: Value, public cdr: Value) {
    }

    toString(): string {
        return `(${this.car.toString()} . ${this.cdr.toString()})`;
    }
}

export type Kont = PKont | RetKont;

export type PKont =
    | KontAtom
    | KontSucceed;

export type RetKont =
    | KontRetValue;

export class KontAtom {
    constructor(public tail: Kont) {
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
        public env: Env = emptyEnv(),
        public kont: PKont = new KontSucceed(),
    ) {
    }
}

export class RetState {
    constructor(public kont: RetKont) {
    }
}

function load(expr: Expr): State {
    return new PState(expr);
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

function handleSymbolOperator(operator: ExprSymbol, operands: Array<Expr>, state: PState): State {
    if (operator.name === "quote") {
        if (operands.length === 0) {
            throw new Error("'quote' without operand");
        }
        else if (operands.length > 1) {
            throw new Error("'quote' with too many operands");
        }
        let value = quoteExpr(operands[0]);
        return new RetState(new KontRetValue(value, state.kont));
    }
    else if (operator.name === "atom") {
        if (operands.length === 0) {
            throw new Error("'atom' without operand");
        }
        else if (operands.length > 1) {
            throw new Error("'atom' with too many operands");
        }
        return new PState(
            operands[0],
            state.env,
            new KontAtom(state.kont),
        )
    }
    else {
        throw new Error(`Unknown operator ${operator.toString()}`);
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
            if (operator instanceof ExprSymbol) {
                return handleSymbolOperator(operator, operands, state);
            }
            else {
                throw new Error("Can't handle non-symbol operator yet");
            }
        }
    }
    else {
        let _coverageCheck: never = expr;
        return _coverageCheck;
    }
}

function reduceRetState(state: RetState): State {
    let retKont = state.kont;
    let value = retKont.value;
    let kont = retKont.tail;
    if (kont instanceof KontAtom) {
        let retValue = value instanceof ValueSymbol
            ? new ValueSymbol("t")
            : new ValueEmptyList();
        return new RetState(new KontRetValue(retValue, kont.tail));
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

function isDeeply(expected: Value, actual: Value): boolean {
    if (expected instanceof ValueSymbol && actual instanceof ValueSymbol) {
        return expected.name === actual.name;
    }
    else if (expected instanceof ValuePair && actual instanceof ValuePair) {
        return isDeeply(expected.car, actual.car) && isDeeply(expected.cdr, actual.cdr);
    }
    else if (expected instanceof ValueEmptyList && actual instanceof ValueEmptyList) {
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
    let expr = new ExprList([new ExprSymbol("quote"), new ExprSymbol("a")]);
    let expected = new ValueSymbol("a");
    let actual = reduceFully(load(expr));
    is(expected, actual, "(quoate a)");
}

{
    let expr = new ExprList([
        new ExprSymbol("quote"),
        new ExprList([
            new ExprSymbol("a"),
            new ExprSymbol("b"),
            new ExprSymbol("c"),
        ]),
    ]);
    let expected = new ValuePair(
        new ValueSymbol("a"),
        new ValuePair(
            new ValueSymbol("b"),
            new ValuePair(
                new ValueSymbol("c"),
                new ValueEmptyList(),
            ),
        ),
    );
    let actual = reduceFully(load(expr));
    is(expected, actual, "(quoate (a b c))");
}

{
    let expr = new ExprList([
        new ExprSymbol("atom"),
        new ExprList([
            new ExprSymbol("quote"),
            new ExprSymbol("a"),
        ]),
    ]);
    let expected = new ValueSymbol("t");
    let actual = reduceFully(load(expr));
    is(expected, actual, "(atom 'a)");
}

{
    let expr = new ExprList([
        new ExprSymbol("atom"),
        new ExprList([
            new ExprSymbol("quote"),
            new ExprList([
                new ExprSymbol("a"),
                new ExprSymbol("b"),
                new ExprSymbol("c"),
            ]),
        ]),
    ]);
    let expected = new ValueEmptyList();
    let actual = reduceFully(load(expr));
    is(expected, actual, "(atom '(a b c))");
}

{
    let expr = new ExprList([
        new ExprSymbol("atom"),
        new ExprList([
            new ExprSymbol("quote"),
            new ExprList([]),
        ]),
    ]);
    let expected = new ValueSymbol("t");
    let actual = reduceFully(load(expr));
    is(expected, actual, "(atom '())");
}