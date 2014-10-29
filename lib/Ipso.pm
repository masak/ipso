use v6;

grammar Lisp::Syntax {
    regex TOP { <value> \s* }
    regex value { \s* <quote>? [<list> | <term>] }
    regex quote { "'" }
    regex list { '(' ~ ')' [<value>* %% \s*] }
    regex term { \w+ }
}

sub parse($input) {
    my $actions = class {
        method TOP($/) { make $<value>.ast }
        method value($/) {
            my $value = $<list> ?? $<list>.ast !! $<term>.ast;
            make $<quote> ?? ['quote', $value] !! $value;
        }
        method list($/) { make [@<value>».ast.list] }
        method term($/) { make ~$/ }
    };
    Lisp::Syntax.parse($input, :$actions)
        or die "Could not parse ‹$input›";
    return $/.ast;
}

my %SETTING =
    caar => parse(q[(lambda (x) (car (car x)))]),
    cdar => parse(q[(lambda (x) (cdr (car x)))]),
    cadr => parse(q[(lambda (x) (car (cdr x)))]),
    cddr => parse(q[(lambda (x) (cdr (cdr x)))]),
    caaar => parse(q[(lambda (x) (car (car (car x))))]),
    cdaar => parse(q[(lambda (x) (cdr (car (car x))))]),
    cadar => parse(q[(lambda (x) (car (cdr (car x))))]),
    cddar => parse(q[(lambda (x) (cdr (cdr (car x))))]),
    caadr => parse(q[(lambda (x) (car (car (cdr x))))]),
    cdadr => parse(q[(lambda (x) (cdr (car (cdr x))))]),
    caddr => parse(q[(lambda (x) (car (cdr (cdr x))))]),
    cdddr => parse(q[(lambda (x) (cdr (cdr (cdr x))))]),
    caddar => parse(q[(lambda (x) (car (cdr (cdr (car x)))))]),
    null => parse(q[
        (lambda (x)
          (eq x '()))]),
    and => parse(q[
        (lambda (x y)
          (cond (x (cond (y 't) ('t '())))
                ('t '())))]),
    # RAKUDO: Can't use 'not' as a bare key in hashes [RT #123084]
    'not' => parse(q[
        (lambda (x)
          (cond (x '())
                ('t 't)))]),
    append => parse(q[
        (lambda (x y)
          (cond ((null x) y)
                ('t (cons (car x) (append (cdr x) y)))))]),
    pair => parse(q[
        (lambda (x y)
          (cond ((and (null x) (null y)) '())
                ((and (not (atom x)) (not (atom y)))
                 (cons (cons (car x) (cons (car y) '()))
                       (pair (cdr x) (cdr y))))))]),
    assoc => parse(q[
        (lambda (x y)
          (cond ((eq (caar y) x) (cadar y))
                ('t (assoc x (cdr y)))))]),
;

class X::NoSuchSymbol is Exception {
    has $.symbol;
    method message { "No such symbol '$.symbol' defined" }
}

class X::EmptyListEvaluated is Exception {
    method message { "Empty list () evaluated" }
}

class X::UnsatisfiedCond is Exception {
    method message { "Fell through all expressions in cond" }
}

class X::IndexIntoEmptyList is Exception {
    method message { "Tried to look into empty list ()" }
}

sub eval($expr, %env) {
    sub atom($expr) { $expr eqv [] || $expr !~~ Array }
    sub eq($e1, $e2) {
        $e1 eqv [] && $e2 eqv []
        || $e1 !~~ Array && $e2 !~~ Array && $e1 eq $e2
    }
    multi car([]) { die X::IndexIntoEmptyList.new }
    multi car([$head, *@tail]) { $head }
    multi cdr([]) { die X::IndexIntoEmptyList.new }
    multi cdr([$head, *@tail]) { @tail }
    sub caar(@list) { car car @list }
    sub cadr(@list) { car cdr @list }
    sub cadar(@list) { car cdr car @list }
    sub caddr(@list) { car cdr cdr @list }
    sub caddar(@list) { car cdr cdr car @list }
    sub cons($head, @tail) { [$head, @tail] }
    sub evcon(@list, %env) {
        die X::UnsatisfiedCond.new
            unless @list;
        return eval(caar(@list), %env) eq 't'
            ?? eval(cadar(@list), %env)
            !! evcon(cdr(@list), %env);
    }
    sub evlis(@list, %env) {
        [@list.map({ eval($_, %env).item })]
    }
    sub pair(@l1, @l2) {
        [(@l1 Z @l2).map({ [$^e1, $^e2] })]
    }
    sub extend(@pairs, %old) {
        my %new = %old;
        for @pairs -> [$k, $v] {
            %new{$k} = $v;
        }
        %new;
    }

    if atom($expr) {
        die X::NoSuchSymbol.new(:symbol($expr))
            unless %env{$expr}:exists;
        die X::EmptyListEvaluated.new
            if $expr eqv [];
        return %env{$expr};
    }
    elsif atom(car($expr)) {
        return do given car($expr) {
            when 'quote' { cadr($expr) }
            when 'atom' { atom(eval(cadr($expr), %env)) ?? 't' !! [] }
            when 'eq' { eq(eval(cadr($expr), %env), eval(caddr($expr), %env)) ?? 't' !! [] }
            when 'car' { car(eval(cadr($expr), %env)) }
            when 'cdr' { cdr(eval(cadr($expr), %env)) }
            when 'cons' { cons(eval(cadr($expr), %env), eval(caddr($expr), %env)) }
            when 'cond' { evcon(cdr($expr), %env) }
            default { # function application
                die X::NoSuchSymbol.new(:symbol(car($expr)))
                    unless %env{car($expr)}:exists;
                eval(cons(%env{car($expr)}, cdr($expr)), %env)
            }
        }
    }
    elsif eq(caar($expr), 'label') {
        return eval(cons(caddar($expr), cdr($expr)), extend([[cadar($expr), car($expr)]], %env));
    }
    elsif eq(caar($expr), 'lambda') {
        return eval(caddar($expr), extend(pair(cadar($expr), evlis(cdr($expr), %env)), %env));
    }
}

sub repr($expr) {
    return $expr ~~ Array ?? "({$expr.map(&repr).join(" ")})" !! $expr;
}

sub lisp($input) is export {
    return repr(eval(parse($input), %SETTING));
}

