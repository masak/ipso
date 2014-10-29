use v6;

grammar Lisp::Syntax {
    regex TOP { <value> \s* }
    regex value { \s* <quote>? [<list> | <term>] }
    regex quote { "'" }
    regex list { '(' ~ ')' [<value>* %% \s*] }
    regex term { \w+ }
}

sub lisp($input) is export {
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
    my $ast = $/.ast;
    return repr(eval($ast, {}));

    sub eval($expr, %env) {
        sub atom($expr) { $expr eqv [] || $expr !~~ Array }
        sub eq($e1, $e2) {
            $e1 eqv [] && $e2 eqv []
            || $e1 !~~ Array && $e2 !~~ Array && $e1 eq $e2
        }
        sub car([$head, *@tail]) { $head }
        sub cdr([$head, *@tail]) { @tail }
        sub caar(@list) { car car @list }
        sub cadr(@list) { car cdr @list }
        sub cadar(@list) { car cdr car @list }
        sub caddr(@list) { car cdr cdr @list }
        sub caddar(@list) { car cdr cdr car @list }
        sub cons($head, @tail) { [$head, @tail] }
        sub evcon(@list, %env) {
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
                    eval(cons(%env{car($expr)}, cdr($expr)), %env)
                }
            }
        }
        elsif eq(caar($expr), 'lambda') {
            return eval(caddar($expr), extend(pair(cadar($expr), evlis(cdr($expr), %env)), %env));
        }
        else {
            die "didn't cover the case of ‹$input›: $ast.perl()";
        }
    }

    sub repr($expr) {
        return $expr ~~ Array ?? "({$expr.join(" ")})" !! $expr;
    }
}
