#! /usr/bin/perl -w
use 5.006;
use strict;

system(q[
    perl -i -wpe'
        s/"module": "commonjs"/"module": "es2015"/
    ' tsconfig.json
]) == 0
    or die "tsconfig.json substitution failed: $?";

system(q[
    rm -rf lib/
]) == 0
    or die "Removing lib/ failed: $?";

system(q[
    npx tsc > /dev/null
]) == 512
    or die "Compiling with 'tsc' gave an unexpected status code: $?";

system(q[
    perl -i -wpe'
        s/"module": "es2015"/"module": "commonjs"/
    ' tsconfig.json
]) == 0
    or die "tsconfig.json back-substitution failed: $?";

-e "lib"
    or die "lib/ wasn't created as expected";

my @files = qw<
    value
    tokenize
    parse-value
    prims
    forms
    env
    expr
    parse-expr
    zip
    std-env
    kont
    state
    evaluate
>;

my $path = "../website-ipso/ipso.js";

open my $OUT, ">", $path
    or die "Couldn't open $path for writing: $!";

for my $file (@files) {
    open my $IN, "<", "lib/src/$file.js"
        or die "Couldn't open lib/src/$file.js for reading: $!";
    while (<$IN>) {
        next if /^import /;
        if ($file eq "std-env") {
            next if /^export \{/;
        }
        else {
            s/^export \{/const $file = {/;
        }
        s/^export //;
        print {$OUT} $_;
    }
    close $IN;
}

close $OUT;

