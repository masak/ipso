use Ipso;
use Test;

is lisp(q[((lambda (x) (cons x '(b))) 'a)]), q[(a b)],
    "lambda and function application are conjugate";
is lisp(q[
    ((lambda (x y) (cons x (cdr y))) 
     'z
     '(a b c))
]), q[(z b c)], "a lambda can have two parameters";

is lisp(q[
    ((lambda (f) (f '(b c)))
     '(lambda (x) (cons 'a x)))
]), q[(a b c)], "lambdas can be quoted and sent as arguments";

done;
