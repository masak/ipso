import {
    ALL_WHITESPACE,
    TOKENIZER,
} from "./tokenize";
import {
    Expr,
    ExprList,
    ExprSymbol,
} from "./expr";

function maybeWrapInQuote(expr: Expr, shouldWrap: boolean): Expr {
    return shouldWrap
        ? new ExprList([new ExprSymbol("quote"), expr])
        : expr;
}

export function parseToExpr(input: string): Expr {
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

