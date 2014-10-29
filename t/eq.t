use Ipso;
use Test;

is lisp(q[(eq 'a 'a)]), q[t], "atoms are equal if they are the same atom";
is lisp(q[(eq 'a 'b)]), q[()], "...and only then";
is lisp(q[(eq '() '())]), q[t], "two empty lists are equal too";
is lisp(q[(eq '(a) '(a))]), q[()], "but two nonempty lists are not equal, even if they have the same content";

done;
