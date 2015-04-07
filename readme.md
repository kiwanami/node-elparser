# Elparser

[![npm version](https://badge.fury.io/js/elparser.svg)](http://badge.fury.io/js/elparser)

A parser for S-expression of emacs lisp and some utilities.

## Sample code

### Parsing S-exp and getting JavaScript objects

```javascript
var elparser = require('elparser');

// list and literals
var obj1 = elparser.parse1("(1 2.3 a \"b\" () (c 'd))");

console.log(obj1.toJS());
// => [ 1, 2.3, 'a', 'b', null, [ 'c', [ 'd' ] ] ]


// alist and hash
var obj2 = elparser.parse1("( (a . 1) (b . \"xxx\") (c 3 4) (\"d\" . \"e\"))");

console.log(obj2.toJS());
// => [ [ 'a', 1 ], [ 'b', 'xxx' ], [ 'c', 3, 4 ], [ 'd', 'e' ] ]

console.log(obj2.toObject());
// => { a: 1, b: 'xxx', c: [ 3, 4 ], d: 'e' }
```

### Encoding JavaScript objects into S-exp

```javascript
elparser.encode([1,1.2,-4,"xxx",[www],true,null])
// => "(1 1.2 -4 \"xxx\" www t nil)"
 
elparser.encode({:a => [1,2,3], :b => {:c => [4,5,6]}})
// => "((a 1 2 3) (b (c 4 5 6)))"
```

## Installation

Add this line to your application's package.json:

```javascript
   "dependencies": {
       "elparser": "*"
   }
```

And then execute:

    $ npm install

Or install it yourself as:

    $ npm install elparser


## API Document

### Parser

The module `elparser` is parser for emacs-lisp S-expression.
The user program creates an instance of the class and parses the S-exp
string with `parse1` method. If the source string has multiple
S-expressions, one can use `parse` method.

If the `elparser.parse1` method succeeds in parsing the given S-exp
string, it returns a `SExp` object which is AST of S-exp. Invoking
`toJS` method of the `SExp` object, one can obtain a JavaScript object.
`elparser.parse` method returns an array of `SExp` objects.

The `SExp` objects are instances of `SExpXXX` classes: `SExpNumber`,
`SExpString`, `SExpSymbol`, `SExpNil`, `SExpCons`, `SExpList`,
`SExpListDot` and `SExpQuoted`. Each classes represent corresponding
S-exp objects.

If the given S-exp list is an alist, invoking `SExpList.toObject` method,
a JavaScript `Object` instance can be obtained.

### Encoder

The module method `elparser.encode` encodes the JavaScript objects into
elisp S-expressions. The another method `elparser.encodeMulti`
receives an array of JavaScript objects and returns a S-expression string in
which multiple S-expressions are concatenated.

If an object which is not defined in serialization rules is given,
this method raises an exception with some messages.
See the next section for the encoding detail.

### Object Mapping

The primitive objects are translated straightforwardly.

#### Decoding (S-expression -> JavaScript)

A quoted expression is translated to an array.
Both `nil` and `()` are translated to `null`.
Cons cells and lists are translated to arrays.

| type              | S-exp (input)       | JavaScript (output)   |
|-------------------|---------------------|-----------------------|
| integer           | `1`                 | `1`                   |
| float             | `1.2`               | `1.2`                 |
| float             | `1e4`               | `1e4`                 |
| float             | `.45`               | `.45`                 |
| symbol            | `abc`               | `"abc"`               |
| string            | `"abc"`             | `"abc"`               |
| quote             | `'abc`              | `["abc"]`             |
| null              | `nil`               | `null`                |
| empty list        | `()`                | `null`                |
| list              | `(1 2)`             | `[1,2]`               |
| nest list         | `(a (b))`           | `["a" ["b"]]`         |
| cons cell         | `(a . b)`           | `["a","b"]`           |
| dot list          | `(a b . d)`         | `["a","b","c"]`       |
| alist(`toJS`)     | `((a . 1) (b . 2))` | `[["a",1],["b",2]]`   |
| alist(`toObject`) | `((a . 1) (b . 2))` | `{"a"=>1,"b"=>2}`     |
| alist list        | `((a 1 2) (b . 3))` | `{"a"=>[1,2],"b"=>3}` |

#### Encoding (JavaScript -> S-expression)

The Array and Object instances are translated to lists and alist
respectively.  Cons cells and quoted expressions can't be expressed by
any JavaScript object.  If those S-expressions are needed, one can obtain
such S-expressions with creating instances of `SExpCons` and
`SExpQuoted` directly and calling the `toStr` method.

| type       | JavaScript (input)                 | S-exp (output)                    |
|------------|------------------------------------|-----------------------------------|
| primitive  | `[1,1.2,-4,"xxx",true,null]`       | `(1 1.2 -4 "xxx" t nil)`          |
| empty list | `[]`                               | `nil`                             |
| nest list  | `[1,[2,[3,4]]]`                    | `(1 (2 (3 4)))`                   |
| hash       | `{"a":"b", "c":"d"}`               | `(("a" . "b") ("c" . "d"))`       |
| hash       | `{"a":[1,2,3], "b":{"c":[4,5,6]}}` | `(("a" 1 2 3) ("b" ("c" 4 5 6)))` |

## License

Copyright (c) 2015 SAKURAI Masashi
Released under the MIT license
