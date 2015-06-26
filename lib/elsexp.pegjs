/*
 * S-expression for emacs lisp
 */

{
    var ast = require('./sexp-ast');
}

start = SExps

SExps = first:SExp rest:(S+ a:SExp {return a;})* {
    rest.unshift(first);
    return rest;
} / first:SExp {
    return [first];
}

S = [\t\v\n\r\f ]

SExp = Nil / DecimalLiteral / Cons / Symbol / String / List / Quoted

String = '"' chars:([^"\\] / "\\" . )* '"' {
      return new ast.SExpString(chars.join(""));
}

List = '(' S* list:SExps S* ')' {
    return new ast.SExpList(list);
}

Cons = '(' S* head:SExps S+ '.' S+ tail:SExp S* ')' {
    if (head.length == 1) return new ast.SExpCons(head[0], tail);
    return new ast.SExpListDot(head, tail);
}

Quoted = '\'' body:SExp {
    return new ast.SExpQuoted(body);
}

Nil = 'nil' {
    return new ast.SExpNil();
} / '(' S* ')' {
    return new ast.SExpNil();
}

Symbol = (!"." start:SymbolStart parts:SymbolPart*) {
    return new ast.SExpSymbol(start + parts.join(""));
}

SymbolStart = [a-z\-.\/_:*+=]i

SymbolPart = [a-z\-.\/_:*+=0-9]i

DecimalLiteral
  = parts:$(DecimalSign? DecimalIntegerLiteral "." DecimalDigits? ExponentPart?) { return ast.SExpNumber.floatVal(parts); }
  / parts:$(DecimalSign? "." DecimalDigits ExponentPart?)     { return ast.SExpNumber.floatVal(parts); }
  / parts:$(DecimalSign? DecimalIntegerLiteral ExponentPart?) { return ast.SExpNumber.intVal(parts); }

DecimalSign = [+-]

DecimalIntegerLiteral
  = "0" / NonZeroDigit DecimalDigits?

DecimalDigits
  = DecimalDigit+

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]

ExponentPart
  = ExponentIndicator SignedInteger

ExponentIndicator
  = [eE]

SignedInteger
  = [-+]? DecimalDigits
