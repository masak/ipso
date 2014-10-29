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
    return repr(eval($ast));

    sub eval($expr) {
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
        sub cons($head, @tail) { [$head, @tail] }
        sub evcon(@list) {
            return eval(caar(@list)) eq 't'
                ?? eval(cadar(@list))
                !! evcon(cdr(@list));
        }

        if atom($expr) {
            die "not handling the case of atom lookup yet";
        }
        elsif atom(car($expr)) {
            given car($expr) {
                when 'quote' { return cadr($expr) }
                when 'atom' { return atom(eval(cadr($expr))) ?? 't' !! [] }
                when 'eq' { return eq(eval(cadr($expr)), eval(caddr($expr))) ?? 't' !! [] }
                when 'car' { return car(eval(cadr($expr))) }
                when 'cdr' { return cdr(eval(cadr($expr))) }
                when 'cons' { return cons(eval(cadr($expr)), eval(caddr($expr))) }
                when 'cond' { return evcon(cdr($expr)) }
            }
            die "didn't cover the other special forms, like ‹$input›: $ast.perl()";
        }
        else {
            die "didn't cover the case of ‹$input›: $ast.perl()";
        }
    }

    sub repr($expr) {
        return $expr ~~ Array ?? "({$expr.join(" ")})" !! $expr;
    }
}
