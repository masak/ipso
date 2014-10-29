use Ipso;
use Test;

is lisp(q[(quote a)]), q[a], "quoting something keeps it intact";
is lisp(q[(quote b)]), q[b], "can quote different things";
is lisp(q['c]), q[c], "there's also a short form";
is lisp(q[(quote (a b c))]), q[(a b c)], "can also quote an entire list";

done;
