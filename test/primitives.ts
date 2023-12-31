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

test("(quote a)", (t) => {
    let expr = parseToExpr("(quote a)");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(quote (a b c))", (t) => {
    let expr = parseToExpr("(quote (a b c))");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(atom 'a)", (t) => {
    let expr = parseToExpr("(atom 'a)");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(atom '(a b c))", (t) => {
    let expr = parseToExpr("(atom '(a b c))");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(atom '())", (t) => {
    let expr = parseToExpr("(atom '())");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(atom (atom 'a))", (t) => {
    let expr = parseToExpr("(atom (atom 'a))");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(atom '(atom 'a))", (t) => {
    let expr = parseToExpr("(atom '(atom 'a))");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eq 'a 'a)", (t) => {
    let expr = parseToExpr("(eq 'a 'a)");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eq 'a 'b)", (t) => {
    let expr = parseToExpr("(eq 'a 'b)");
    let expected = parseToValue("()");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eq '() '())", (t) => {
    let expr = parseToExpr("(eq '() '())");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(car '(a b c))", (t) => {
    let expr = parseToExpr("(car '(a b c))");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cdr '(a b c))", (t) => {
    let expr = parseToExpr("(cdr '(a b c))");
    let expected = parseToValue("(b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cons 'a '(b c))", (t) => {
    let expr = parseToExpr("(cons 'a '(b c))");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cons 'a (cons 'b (cons 'c '())))", (t) => {
    let expr = parseToExpr("(cons 'a (cons 'b (cons 'c '())))");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(car (cons 'a '(b c)))", (t) => {
    let expr = parseToExpr("(car (cons 'a '(b c)))");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cdr (cons 'a '(b c)))", (t) => {
    let expr = parseToExpr("(cdr (cons 'a '(b c)))");
    let expected = parseToValue("(b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cond ((eq 'a 'b) 'first) ((atom 'a) 'second))", (t) => {
    let expr = parseToExpr("(cond ((eq 'a 'b) 'first) ((atom 'a) 'second))");
    let expected = parseToValue("second");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cond ((atom 'a) 'first) ((eq 'a 'b) 'second))", (t) => {
    let expr = parseToExpr("(cond ((atom 'a) 'first) ((eq 'a 'b) 'second))");
    let expected = parseToValue("first");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(cond ((eq 'a 'b) 'huh))", (t) => {
    let expr = parseToExpr("(cond ((eq 'a 'b) 'huh))");
    t.throws(() => evaluate(expr));
});

test("((lambda (x) (cons x '(b))) 'a)", (t) => {
    let expr = parseToExpr("((lambda (x) (cons x '(b))) 'a)");
    let expected = parseToValue("(a b)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("((lambda (x y) (cons x (cdr y))) 'z '(a b c))", (t) => {
    let expr = parseToExpr("((lambda (x y) (cons x (cdr y))) 'z '(a b c))");
    let expected = parseToValue("(z b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("((lambda (f) (f '(b c))) (lambda (x) (cons 'a x)))", (t) => {
    let expr = parseToExpr(
        "((lambda (f) (f '(b c))) (lambda (x) (cons 'a x)))"
    );
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("((label subst ...) 'm 'b ...)", (t) => {
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
    t.deepEqual(expected, actual);
});

