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

See [docs/three-surprises.md](./docs/three-surprises.md).

## Compiling to an intermediate representation

We take things in two big steps. The first, compiling to an intermediate
representation. This makes some statically known or inferrable things clear
in the code, and breaks it down into smaller steps. It's also straightforward
to flatten the intermediate representation to bytecode later &mdash; that is
the second step.

### Variable lookup

A variable lookup in code has two parts:

* The _static part_, where the variable lookup is resolved to the innermost
  binder which defines it. The resulting lookup information, if successful,
  is of the form "M steps out, slot number N".

* The _dynamic part_, where a value is looked up using the "M steps out, slot
  number N" information, together with an _environment_, a linked list of at
  least N frames, the Nth of which has at least M slots.

In case the static lookup is successful, we generate `(lookup M N)`.

In case it wasn't, we generate `(error (concat "Variable " name
" not found"))`.

### Quote

Quotation proceeds through a nested list structure, in preorder.

* Leaf nodes are either symbols or the empty list.
    * A symbol generates `(symbol N)`, where `N` is a number (like a `u64`)
      indexing into a global symbol registry. If the symbol wasn't already in
      this registry, we add it and give it a fresh index.
    * The empty list generates `(empty-list)`.
* Internal nodes cons the results of their children together, right-to-left.
    * Start by generating `(empty-list)`; call this `L`.
    * For each child node `e`, right-to-left:
        * Calculate `(cons e L)`; call this new list `L`.
    * The end result is `L`.

### Conditional

A conditional has this form:

```
(cond c1 e1
      c2 e2
      ...
      cN eN)
```

Equationally, this is equivalent to a simpler `if`:

```
(if c1 e1
       (if c2 e2
              ...
              (if cN eN
                     (error "Fell off cond"))))
```

Let's consider a single `if`:

```
(if c e-then e-else)
```

For the intermediate format, we use "label binders":

```
(fwd-label AFTER-IF
  (fwd-label AFTER-THEN
    (jump-unless-nil c AFTER-THEN)
    e-then
    (jump AFTER-IF))
  e-else)
```

This is still a nested format, but it's much easier to generate linear
bytecode from it, thanks to the named labels.

### Function application

A function application looks like this:

```
(closure-expr a1 a2 ... aN)
```

There are two challenges here:

* In order to maintain a "flat" intermediate representation, we need to compute
  all the arguments `a1 a2 ... aN`, and store them in temporary registers.

* In order for the "call function" opcode to have bounded size, the call must
  only make use of indexed slots, both for the called closure and all the
  arguments.

The resulting intermediate code looks something like this:

```
(set-slot sc closure-expr)
(set-slot s1 a1)
(set-slot s2 a2)
...
(set-slot sN aN)
(call sc s1 s2 ... sN)
```

### Lambda

A lambda generates a function value, but let's call it a _closure_ for greater
impact. A closure has two parts:

1. The _environment_, supplied by the runtime. This is so that the function
   body can access variables declared outside the function.
2. The _code_, consisting of two parts:
    * A _parameter list_, but this is really a nonnegative integer.
    * _Instructions_, the result of recursively compiling the function body.

Importantly, the code part is compiled/prepared once, and can then be re-used
with a different environment in each created closure.

Generates as `(closure c)`, where `c` is an index into a global code registry.
Again, the environment is supplied by the runtime.

### Label

An expression `(label name expr)` generates the following:

```
(rec expr)
```

Where `expr` has been compiled in a new scope that binds `name` to its single
slot.

### Intermediate format instructions

| Form                       | Type              |
|----------------------------|-------------------|
| `(lookup M N)`             | `IrLookup`        |
| `(error msg)`              | `IrError`         |
| `(symbol sy)`              | `IrSymbol`        |
| `(empty-list)`             | `IrEmptyList`     |
| `(cons e L)`               | `IrCons`          |
| `(fwd-label lbl IR)`       | `IrFwdLabel`      |
| `(jump-unless-nil e lbl)`  | `IrJumpUnlessNil` |
| `(jump lbl)`               | `IrJump`          |
| `(set-slot r e)`           | `IrSetSlot`       |
| `(call sc s1 s2 ... sN)`   | `IrCall`          |
| `(closure c)`              | `IrClosure`       |
| `(rec e)`                  | `IrRec`           |

### Tail calls

In fact, there's an easy addition we might as well make:

| Form                          | Type              |
|-------------------------------|-------------------|
| ...                           | ...               |
| `(call sc s1 s2 ... sN)`      | `IrCall`          |
| `(tail-call sc s1 s2 ... sN)` | `IrTailCall`      |
| ...                           | ...               |

The `tail-call` opcode is then used in _tail-call position_, which is defined
inductively as follows:

* Expressions at the end of a function definitions are in tail-call position.
* If an `if` expression is in tail-call position, then both its "then" branch
  expression and its "else" branch expression are also in tail-call position.

Semantically, a tail call eliminates the need to return to the current function
activation after the function call to `sf` completes. Instead, we can return
immediately to the current function's caller. In other words, tail calls can
act more like "go to" instructions, because they give all the benefits of a
function call but without growing the stack.

