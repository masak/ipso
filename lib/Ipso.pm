use v6;

sub lisp($input) is export {
    if $input ~~ /^ '(' 'quote' \h+ (\w+) ')' $/ {
        return ~$0;
    }
    if $input ~~ /^ '(' 'quote' \h+ ('(' [\w+]* % [\h*] ')') ')' $/ {
        return ~$0;
    }
    if $input ~~ /^ "'" (\w+) $/ {
        return ~$0;
    }
    die "Unknown input ‹$input›";
}
