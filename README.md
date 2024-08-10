_Res ipsa loquitur_ &mdash; Latin, meaning "the thing speaks for itself"

Largely following the steps noted down in pg's [The Roots of
Lisp](http://slackwise.net/files/docs/The%20Roots%20of%20Lisp.pdf).
Blissfully ignoring the admonitions in [this axis-of-eval blog
post](http://axisofeval.blogspot.com/2010/08/no-more-minimal-early-lisps-pulleezz.html).

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
time: it was the apostrophe/quote mark before `(lambda (x) (cons 'a x))`
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
It came as a surprise to me only because I've internalized and gotten
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
      new type of value which we'll call a _function value_.
      The internal representation of a function value is not set in stone;
      in particular, it may or may not be just a textual `lambda` form.
    - On the usage side, always look up the operator name (choosing whether
      or not to hard-code the built-ins and special forms first); if the
      value found is a function value, invoke it &mdash; that is, evaluate
      the operands, extend the environment with the resulting arguments,
      and evaluate the function value's body in the extended environment.
    - Consistent principle: just as there's a distinction between the
      _numeral_ "5" and the _number_ 5, there's a distinction between how
      you _write_ a function in code, and the underlying _value_ it
      represents/evaluates to.
    - Consistent principle: `lambda` itself already "delays evaluation",
      by wrapping its body inside an abstraction. Using `quote` is
      superfluous.

The esoteric approach has more moving parts (a new type of value) and takes
more explaining, but as an idea it also has longer reach.

> Each formalism implies a specific distinction between objects and the
> system of their combination. Thereby, the concept of _function_ has a
> peculiar role: it governs how objects interact, and is also an object of
> computation. Over more than a century, this intermediary status has
> broached the problem of how exactly a formalism should admit functions as
> _first-class citizens_.
>
> &mdash; "Sans-Papiers as First-Class Citizens", Julian Rohrhuber

Of course, the textual approach becomes tightly associated with _dynamic
lookup_ of variables, whereas the esoteric approach favors _static_ or _lexical
lookup_. The reason is simple: in the textual approach, the only thing you can
do is turn to the interpreter and ask it for the value of the variable. There's
no function value with a corresponding scope-at-construction to consult;
there's only the "current scope" of the interpreted process.

### Surprise 2: `defun` is not simply sugar for `label` + `lambda`

In the text, `defun` is introduced as being _exactly_ a `label` containing a
`lambda`. This is good enough for making the name of the defined function
visible inside the function's body itself, but it doesn't make the name
visible outside the function and after the definition.

Without that, a `defun` is pretty useless. My point is that some extra
component is missing here; something like "affect the scope we're in by adding
a new binding to it". But no. This is what a definition _is_: an effectful
action after which the scope of the definition has been extended with a new
name and definiend. In "The Roots of Lisp", there is no primitive that does
this.

### Surprise 3: Global scope and mutually recursive definitions

Let's say for argument's sake that we don't like the idea of destructively
mutating the global environment, and so in order to support the issue
identified in Surprise 2, we do the following: every time we interpret a
`defun`, we (a) desugar it to a `label` and `lambda`, which takes care of
recursive calls and other references inside the body of the function itself,
and (b) create a new environment extended with this new definition, to use in
subsequent REPL interactions, or in the rest of the Lisp file.

This works fine for almost everything, but it doesn't handle mutually
recursive functions. Consider this set of mutually recursive functions in Bel:

```
(def even (n)
  (if (= n 0) t (odd (- n 1))))

(def odd (n)
  (if (= n 0) nil (even (- n 1))))
```

The fact that `odd` calls `even` is fine. But when `even` tries to call `odd`, 
it won't find it in the environment in which `even` was defined, because
temporally at that point `odd` _hasn't_ been defined yet. (Put differently,
`even` gets bound using that older, smaller environment in which `odd` doesn't
exist. At the time `odd` is defined, we update our running global environment,
but we don't update the environment in which `even` was defined.)

What we are forced to concede that we want is some kind of "reference cell
semantics" for the global environment and for `defun`. Possibly also for
smaller nested environments; whereas `lambda` and `let` are non-destructive
extensions of an environment, `defun` is a destructive _update_ of an
environment; a side-effect. The example with mutually recursive functions shows
that this is in a sense what we expect.

This is why the corresponding built-in operative `$define!` in Kernel has an
exclamation mark in its name: because it destructively updates the evaluator's
current environment.

"The Roots of Lisp" needs another primitive like `update-environment` or
something.

This is not a theoretical quibble. pg's
[jmc.lisp](https://sep.turbifycdn.com/ty/cdn/paulgraham/jmc.lisp?t=1688221954&)
uses (Common Lisp's) `defun` all over the place without considering it one of
his 7 primitives.

> ```
> ; The Lisp defined in McCarthy's 1960 paper, translated into CL.
> ; Assumes only quote, atom, eq, cons, car, cdr, cond.
> ```

And then `eval.` and `evcon.` mutually depend on each other, which means that
pg's code also makes use of this implicit undeclared `update-environment`
primitive to work properly. Also `eval.` and `evlis.` mutually depend on each
other.

All this is fine! I'm not even complaining; but I think this shows the dangers
Reynolds is talking about. Would you notice the implicit dependency on
destructively updating the global environment unless it was pointed out
explicitly?

Of the seven primitives explicitly assumed, only `quote` and `cond` are
"special", in the sense that their behavior in the evaluator is
non-compositional and doesn't just involve evaluating all the operands and then
acting on the results. Later, `label` and `lambda` get added to this list as
well. But something like `update-environment` is also needed, if we want to
fully describe the effects of `defun` in the object language.

