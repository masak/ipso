import test from "ava";
import {
    parseToExpr,
} from "../src/parse-expr";
import {
    parseToValue,
} from "../src/parse-value";
import {
    evaluate,
} from "../src/compile";

test("(eval 'x '((x a) (y b)))", (t) => {
    let expr = parseToExpr("(eval 'x '((x a) (y b)))");
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eval '(eq 'a 'a) '())", (t) => {
    let expr = parseToExpr("(eval '(eq 'a 'a) '())");
    let expected = parseToValue("t");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eval '(cons x '(b c)) '((x a) (y b)))", (t) => {
    let expr = parseToExpr("(eval '(cons x '(b c)) '((x a) (y b)))");
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eval '(cond ((atom x) 'atom) ('t 'list)) '((x '(a b))))", (t) => {
    let expr = parseToExpr(`
        (eval '(cond ((atom x) 'atom)
                     ('t 'list))
              '((x '(a b))))
    `);
    let expected = parseToValue("list");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eval '((lambda (x) (cons 'a x)) '(b c)) '())", (t) => {
    let expr = parseToExpr(`
        (eval '((lambda (x) (cons 'a x)) '(b c))
              '())
    `);
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eval '(f '(b c)) '((f (lambda (x) (cons 'a x)))))", (t) => {
    let expr = parseToExpr(`
        (eval '(f '(b c))
              '((f (lambda (x) (cons 'a x)))))
    `);
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eval '((label ...) y) ...)", (t) => {
    let expr = parseToExpr(`
        (eval '((label firstatom (lambda (x)
                                   (cond ((atom x) x)
                                         ('t (firstatom (car x))))))
                y)
              '((y ((a b) (c d)))))
    `);
    let expected = parseToValue("a");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test("(eval '((lambda ...) 'a '(b c d)) '())", (t) => {
    let expr = parseToExpr(`
        (eval '((lambda (x y) (cons x (cdr y)))
                'a
                '(b c d))
              '())
    `);
    let expected = parseToValue("(a c d)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

test(
    "(eval '((lambda (f) (f '(b c))) '(lambda (x) (cons 'a x))) '())",
    (t) => {

    let expr = parseToExpr(`
        (eval '((lambda (f) (f '(b c)))
                '(lambda (x) (cons 'a x)))
              '())
    `);
    let expected = parseToValue("(a b c)");
    let actual = evaluate(expr);
    t.deepEqual(expected, actual);
});

