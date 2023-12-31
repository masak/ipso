_Res ipsa loquitur_ &mdash; Latin, meaning "the thing speaks for itself"

Largely following the steps noted down in pg's
[The Roots of Lisp](http://lib.store.yahoo.net/lib/paulgraham/jmc.ps).
Blissfully ignoring the admonitions in
[this axis-of-eval blog post](http://axisofeval.blogspot.com/2010/08/no-more-minimal-early-lisps-pulleezz.html).

## Example REPL session

    >>> (car '(x))
    x
    >>> (eq 'foo (car '(foo)))
    t
    >>> ((lambda (x) (cons x '(b))) 'a)
    (a b)
    >>> (eval '((lambda (x) (cons x '(b))) 'a) '())
    (a b)

## Short-term plan

* Make a REPL work in a web page
* Change the 'eval' evaluator to compare values, not symbols
* Change the 'eval' evaluator to pass function values, not lambda exprs
* Change the 'eval' evaluator to accept varargs

