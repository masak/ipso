use Ipso;
use Test;

throws_like { lisp(q[foo]) }, X::NoSuchSymbol;
throws_like { lisp(q[(foo 'x)]) }, X::NoSuchSymbol;
throws_like { lisp(q[()]) }, X::EmptyListEvaluated;
throws_like { lisp(q[(cond)]) }, X::UnsatisfiedCond;
throws_like { lisp(q[(cond ('() 't))]) }, X::UnsatisfiedCond;
throws_like { lisp(q[(car '())]) }, X::IndexIntoEmptyList;
throws_like { lisp(q[(cdr '())]) }, X::IndexIntoEmptyList;

done;
