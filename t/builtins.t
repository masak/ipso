use Ipso;
use Test;

# all these can be built in a kind of "setting" on top of the primitives

is lisp(q[(caar '((A b) c d))]), q[A], "caar";
is lisp(q[(cdar '((a B) c d))]), q[(B)], "cdar";
is lisp(q[(cadr '((a b) C d))]), q[C], "cadr";
is lisp(q[(cddr '((a b) c D))]), q[(D)], "cddr";

is lisp(q[(caaar '(((A b) c d) (e f) g h))]), q[A], "caaar";
is lisp(q[(cdaar '(((a B) c d) (e f) g h))]), q[(B)], "cdaar";
is lisp(q[(cadar '(((a b) C d) (e f) g h))]), q[C], "cadar";
is lisp(q[(cddar '(((a b) c D) (e f) g h))]), q[(D)], "cddar";
is lisp(q[(caadr '(((a b) c d) (E f) g h))]), q[E], "caadr";
is lisp(q[(cdadr '(((a b) c d) (e F) g h))]), q[(F)], "cdadr";
is lisp(q[(caddr '(((a b) c d) (e f) G h))]), q[G], "caddr";
is lisp(q[(cdddr '(((a b) c d) (e f) g H))]), q[(H)], "cdddr";

# dangit, can't be bothered to add them all. but caddar is used by eval
is lisp(q[(caddar '((a b C) d))]), q[C], "caddar";

is lisp(q[(null 'a)]), q[()], "this is not the empty list";
is lisp(q[(null '())]), q[t], "this is";

is lisp(q[(and (atom 'a) (eq 'a 'a))]), q[t], "two true things are true";
is lisp(q[(and (atom 'a) (eq 'a 'b))]), q[()], "true and false is false";

is lisp(q[(not (eq 'a 'a))]), q[()], "not true is false";
is lisp(q[(not (eq 'a 'b))]), q[t], "not false is true";

is lisp(q[(append '(a b) '(c d))]), q[(a b c d)], "appending two nonempty lists";
is lisp(q[(append '() '(c d))]), q[(c d)], "appending an empty list with a nonempty one";
is lisp(q[(append '(a b) '())]), q[(a b)], "and the other way around";

is lisp(q[(pair '(x y z) '(a b c))]), q[((x a) (y b) (z c))], "zipping together two lists";

is lisp(q[(assoc 'x '((x a) (y b)))]), q[a], "looking up something in an association list";
is lisp(q[(assoc 'x '((x new) (x a) (y b)))]), q[new], "newer entries shadow older ones";

done;
