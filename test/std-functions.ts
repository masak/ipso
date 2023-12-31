import test from "ava";
import {
    parseToExpr,
} from "../src/parse-expr";
import {
    parseToValue,
} from "../src/parse-value";
import {
    evaluate,
} from "../src/evaluate";

test("(cadr '((a b) (c d) e))", (t) => {
    let expr = parseToExpr("(cadr '((a b) (c d) e))");
    let expected = parseToValue("(c d)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(caddr '((a b) (c d) e))", (t) => {
    let expr = parseToExpr("(caddr '((a b) (c d) e))");
    let expected = parseToValue("e");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cdar '((a b) (c d) e))", (t) => {
    let expr = parseToExpr("(cdar '((a b) (c d) e))");
    let expected = parseToValue("(b)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(list 'a 'b 'c)", (t) => {
    let expr = parseToExpr("(list 'a 'b 'c)");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(null 'a)", (t) => {
    let expr = parseToExpr("(null 'a)");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(null '())", (t) => {
    let expr = parseToExpr("(null '())");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(and (atom 'a) (eq 'a 'a))", (t) => {
    let expr = parseToExpr("(and (atom 'a) (eq 'a 'a))");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(and (atom 'a) (eq 'a 'b))", (t) => {
    let expr = parseToExpr("(and (atom 'a) (eq 'a 'b))");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(not (eq 'a 'a))", (t) => {
    let expr = parseToExpr("(not (eq 'a 'a))");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(not (eq 'a 'b))", (t) => {
    let expr = parseToExpr("(not (eq 'a 'b))");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(append '(a b) '(c d))", (t) => {
    let expr = parseToExpr("(append '(a b) '(c d))");
    let expected = parseToValue("(a b c d)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(append '() '(c d))", (t) => {
    let expr = parseToExpr("(append '() '(c d))");
    let expected = parseToValue("(c d)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(zip '(x y z) '(a b c))", (t) => {
    let expr = parseToExpr("(zip '(x y z) '(a b c))");
    let expected = parseToValue("((x a) (y b) (z c))");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(assoc 'x '((x a) (y b)))", (t) => {
    let expr = parseToExpr("(assoc 'x '((x a) (y b)))");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(assoc 'x '((x new) (x a) (y b)))", (t) => {
    let expr = parseToExpr("(assoc 'x '((x new) (x a) (y b)))");
    let expected = parseToValue("new");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

