use Ipso;
use Test;

is lisp(q[
    ((label subst (lambda (x y z)
                    (cond ((atom z)
                           (cond ((eq z y) x)
                                 ('t z)))
                          ('t (cons (subst x y (car z))
                                    (subst x y (cdr z)))))))
      'm 'b '(a b (a b c) d))
]), q[(a m (a m c) d)], "can define a recursive function using label";

done;
