use Ipso;
use Test;

is lisp(q[(cons 'a '(b c))]), q[(a b c)], "cons adds a value to the head of a list";
is lisp(q[(cons 'a (cons 'b (cons 'c '())))]), q[(a b c)],
    "conceptually, any list can built from repeated conses on the empty list";
is lisp(q[(car (cons 'a '(b c)))]), q[a], "car gets the head back from a cons";
is lisp(q[(cdr (cons 'a '(b c)))]), q[(b c)], "cdr gets the tail back from a cons";

done;
