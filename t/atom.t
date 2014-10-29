use Ipso;
use Test;

is lisp(q[(atom 'a)]), q[t], "this is a single atom";
is lisp(q[(atom '(a b c))]), q[()], "this is not, it's a non-empty list";
is lisp(q[(atom '())]), q[t], "the empty list counts as an atom, too";

is lisp(q[(atom (atom 'a))]), q[t], "the inner thing evaluates to 't, which is an atom";
is lisp(q[(atom '(atom 'a))]), q[()], "in this case, the inner thing is a list, not an atom";

done;
