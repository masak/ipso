_Res ipsa loquitur_ &mdash; Latin, meaning "the thing speaks for itself"

Largely following the steps noted down in pg's
[The Roots of Lisp](http://lib.store.yahoo.net/lib/paulgraham/jmc.ps).
Blissfully ignoring the admonitions in
[this axis-of-eval blog post](http://axisofeval.blogspot.com/2010/08/no-more-minimal-early-lisps-pulleezz.html).

## Example REPL session

    >>> (car '(x))
    x
    >>> (eq 'foo (car '(foo)))
    t
    >>> ((lambda (x) (cons x '(b))) 'a)
    (a b)
    >>> (eval '((lambda (x) (cons x '(b))) 'a) '())
    (a b)

## Short-term plan

* Make a REPL work in a web page
* Change the 'eval' evaluator to compare values, not symbols
* Change the 'eval' evaluator to pass function values, not lambda exprs
* Change the 'eval' evaluator to accept varargs

## Three surprises on the way to the interpreter

Reynolds warns in his "Definitional Interpreters" that it's very easy for
features of the implementing language to "leak through" into the language
or interpreter being implemented. The risk is especially high when you're
using something like Common Lisp as the metalanguage; you might be using
a feature without noticing.

By defining a CEK machine, I head off such implicit usages of features.
I need to explicitly support things that the Ipso evaluator on top will
then use. If I don't, then the evaluator simply won't work.

The following three things surprised me along the way, things that "The
Roots of Lisp" swept under the rug but I needed to address in order to
build the evaluator.

### Surprise 1: First-class functions are quoted lambdas

This first one was a surprise, but it's not wrong as such. It's just
surprising from a modern, Scheme-enlightened perspective. It's about what
functions _are_ when you pass them around in the program.

Let me quote the relevant part of "The Roots of Lisp":

> If an expression has as its first element an atom _f_ that is not one of
> the primitive operators
>
> `(`_f_ _a<sub>1</sub>_ ... _a<sub>n</sub>_`)`
>
> and the value of _f_ is a function `(lambda (`_p<sub>1</sub>_ ...
> _p<sub>n</sub>_`)` _e_`)` then the value of the expression is the value of
>
> `((lambda (`_p<sub>1<sub>_ ... _p<sub>n</sub>_`)` _e_`)` _a<sub>1</sub>_
> ... _a<sub>n</sub>_`)`
>
> In other words, parameters can be used as operators in expressions as well
> as arguments:
>
> ```
> > ((lambda (f) (f '(b c)))
>    '(lambda (x) (cons 'a x)))
> (a b c)
> ```

It goes by really quickly, so let me just mention what threw me off this
time: it was the apostrophe/quote sign before `(lambda (x) (cons 'a x))`
in that final example evaluation.

It means that, when we pass a function (as the lambda in that example to
the `f` parameter) we literally _quote a `lambda` form_ and pass it,
unevaluated. Later, we look up `f`, find the `lambda` form, and
_substitute it in directly_ in place of the `f`. That is, evaluation
of `(f '(b c))` looks up `f` and delegates to evaluation of
`((lambda (x) (cons 'a x)) '(b c))`.

> If we were to understand program composition on the lexical level only,
> there would be no apparent reason why the text representing a procedure
> couldn't replace the text representing a variable before the compound
> expression is executed.
>
> &mdash; "Sans-Papiers as First-Class Citizens", Julian Rohrhuber

Let's call this approach the **textual** approach to first-class functions.
It came as a surprised to me only because I've internalized and gotten
used to the modern alternative, which we might call the **esoteric**
approach. Let me show them side by side to compare them:

* Textual approach:
    - On the passing side, quote the `lambda` (delaying its evaluation).
    - On the usage side, when the operator is not in the closed set of
      primitives, look up its value and substitute it in, re-evaluating.
    - Consistent principle: `quote` is used whenever we are passing data.
    - Consistent principle: `lambda` is only (sensibly) evaluated in
      operator position; that is, first in a form.
* Esoteric approach:
    - On the passing side, _evaluate_ the `lambda`. This results in a
      previously-unseen type of value which we'll call a _function object_.
      The internal representation of a function object is not so constrained;
      in particular, it may or may not be just a `lambda` form.
    - On the usage side, always look up the operator name (choosing whether
      or not to hard-code the built-ins and special forms first); if the
      value found is a function object, invoke it &mdash; that is, evaluate
      the operands, extend the environment with the resulting arguments,
      and evaluate the function value's body in the extended environment.
    - Consistent principle: just as there's a distinction between the
      _numeral_ "5" and the _number_ 5, there's a distinction between how
      you _write_ a function in code, and the underlying _value_ it
      evaluates to.
    - Consistent principle: `lambda` itself _already_ delays evaluation,
      by wrapping code inside an abstraction. Using `quote` is superfluous.

The esoteric approach has more moving parts (a new type of value) and takes
more explaining, but as an idea it also has longer reach. The reason has to
do with lexical variable scope.

> Each formalism implies a specific distinction between objects and the
> system of their combination. Thereby, the concept of _function_ has a
> peculiar role: it governs how objects interact, and is also an object of
> computation. Over more than a century, this intermediary status has
> broached the problem of how exactly a formalism should admit functions as
> _first-class citizens_.
>
> &mdash; "Sans-Papiers as First-Class Citizens", Julian Rohrhuber

...

### Surprise 2: `defun` is not simply sugar for `label` + `lambda`

In the text, `defun` is introduced as being _exactly_ a `label` containing a
`lambda`. This is good enough for making the name of the defined function
visible inside the function's body itself, but it doesn't make the name
visible after the function.

Without that, a `defun` is pretty useless. My point is that some extra
component is missing here; something like "affect the scope we're in by adding
a new binding to it". But no.

### Surprise 3: Global scope and mutually recursive definitions

...

