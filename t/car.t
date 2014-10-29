use Ipso;
use Test;

is lisp(q[(car '(a b c))]), q[a], "car takes the head of a list";

done;
