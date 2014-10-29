Largely following the steps noted down in pg's
[The Roots of Lisp](http://lib.store.yahoo.net/lib/paulgraham/jmc.ps).

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
