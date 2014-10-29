use Ipso;
use Test;

is lisp(q[
    (eval 'x '((x a) (y b)))
]), q[a], "can evaluate a term against an env";

is lisp(q[
    (eval '(atom 'a) '())
]), q[t], "can evaluate atom";

is lisp(q[
    (eval '(eq 'a 'a) '())
]), q[t], "can evaluate eq";

is lisp(q[
    (eval '(cons x '(b c))
          '((x a) (y b)))
]), q[(a b c)], "can evaluate cons";

is lisp(q[
    (eval '(car '(a b)) '())
]), q[a], "can evaluate car";

is lisp(q[
    (eval '(cdr '(a b)) '())
]), q[(b)], "can evaluate cdr";

is lisp(q[
    (eval '(cond ((eq 'a 'b) 'first)
                 ((atom 'a) 'second)) '())
]), q[second], "can evaluate cond";

is lisp(q[
    (eval '((lambda (f) (f '(b c)))
            '(lambda (x) (cons 'a x))) '())
]), q[(a b c)], "can evaluate lambdas and function calls";

is lisp(q[
    (eval '((label subst (lambda (x y z)
                           (cond ((atom z)
                                  (cond ((eq z y) x)
                                        ('t z)))
                                 ('t (cons (subst x y (car z))
                                           (subst x y (cdr z)))))))
            'm 'b '(a b (a b c) d)) '())
]), q[(a m (a m c) d)], "can evaluate label and do recursion";

done;
