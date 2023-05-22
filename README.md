_Res ipsa loquitur_ &mdash; Latin, meaning "the thing speaks for itself"

Largely following the steps noted down in pg's
[The Roots of Lisp](http://lib.store.yahoo.net/lib/paulgraham/jmc.ps).
Blissfully ignoring the admonitions in
[this axis-of-eval blog post](http://axisofeval.blogspot.com/2010/08/no-more-minimal-early-lisps-pulleezz.html).

## Example REPL session

    $ perl6 -Ilib repl
    >>> (car '(x))
    x
    >>> (eq 'foo (car '(foo)))
    t
    >>> ((lambda (x) (cons x '(b))) 'a)
    (a b)
    >>> (eval '((lambda (x) (cons x '(b))) 'a) '())
    (a b)
    >>> ^D
    $

## Plans

    <masak> possible future directions:
    <masak> (a) lexical scoping -- currently it's dynamic, which is not so nice
    <masak> (b) macros -- requires (a), pretty much
    <masak> (c) an ALGOL-like syntax on top of the language... turning it into Dylan, I guess
