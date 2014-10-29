use Ipso;
use Test;

throws_like { lisp(q[foo]) }, X::NoSuchSymbol;
throws_like { lisp(q[(foo 'x)]) }, X::NoSuchSymbol;

done;
