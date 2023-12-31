import {
    Value,
    ValueEmptyList,
    ValuePair,
    ValueSymbol,
} from "./value";

const TOKENIZER = /^(?:\s+|\(|\)|'|[\p{Letter}\p{Number}+\-*\/]+)/u;
const ALL_WHITESPACE = /^\s+$/;

export function parseToValue(input: string): Value {
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

