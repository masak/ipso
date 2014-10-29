use Ipso;
use Test;

is lisp(q[
    (cond ((eq 'a 'b) 'first)
          ((atom 'a) 'second))
]), q[second], "the cond form picks the expression going with the first true test";

is lisp(q[
    (cond ((eq 'x 'y) 'nah)
          ('t 'awyeah))
]), q[awyeah], "the t atom is the definition of truth so it always gets picked";

done;
