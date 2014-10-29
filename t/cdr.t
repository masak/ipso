use Ipso;
use Test;

is lisp(q[(cdr '(a b c))]), q[(b c)], "cdr takes the tail of a list";

done;
