use v6;

grammar Lisp::Syntax {
    regex TOP { <value> }
    regex value { <quote>? [<list> | <term>] }
    regex quote { "'" }
    regex list { '(' ~ ')' [<value>* % \h] }
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
        sub cadr(@list) { car cdr @list }
        sub caddr(@list) { car cdr cdr @list }

        if atom($expr) {
            die "not handling the case of atom lookup yet";
        }
        elsif atom(car($expr)) {
            given car($expr) {
                when 'quote' { return cadr($expr) }
                when 'atom' { return atom(eval(cadr($expr))) ?? 't' !! [] }
                when 'eq' { return eq(eval(cadr($expr)), eval(caddr($expr))) ?? 't' !! [] }
                when 'car' { return car(eval(cadr($expr))) }
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
