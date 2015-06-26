var assert = require("power-assert");
var pc = require("../index.js");

function parseSexp(input) {
	var ret = pc.parse1(input);
	assert.ok(ret, input);
	return JSON.stringify(ret.toJS());
}

describe("Atom", function() {
	it('should be parsed', function() {
		assert.equal(parseSexp("1"), '1');
		assert.equal(parseSexp("1 \t\f\t\r\n"), '1'); // remove trailing space

		assert.equal(parseSexp("1.123"), '1.123');
		assert.equal(parseSexp("-1.23"), '-1.23');
		assert.equal(parseSexp("+1.23"), '1.23');
		assert.equal(parseSexp(".45"), '0.45');
		assert.equal(parseSexp("1.732e+5"), '173200');

		assert.equal(parseSexp("abc"), '\"abc\"');
		assert.equal(parseSexp("\"abcde\""), '\"abcde\"');

		assert.equal(parseSexp("'abc"), '["abc"]');

		assert.equal(parseSexp("nil"), 'null');
	});
});

describe("Cons / List", function() {
	it("should be parsed", function() {
		assert.equal(parseSexp("()"), 'null');
		assert.equal(parseSexp("(1)"), '[1]');
		assert.equal(parseSexp("(1 2)"), '[1,2]');
		assert.equal(parseSexp("(1 (2 3) 4)"), '[1,[2,3],4]');
		assert.equal(parseSexp("(((1)))"), '[[[1]]]');
		assert.equal(parseSexp("(1 'a \"b\" ())"), '[1,[\"a\"],\"b\",null]');
		assert.equal(parseSexp("(+ 1 2 (- 2 (* 3 4)))"), '[\"+\",1,2,[\"-\",2,[\"*\",3,4]]]');
		assert.equal(parseSexp("(((1.0) 0.2) 3.4e+4)"), '[[[1],0.2],34000]');
		assert.equal(parseSexp("(1 . 2)"), '[1,2]');
		assert.equal(parseSexp("(1 2 . 3)"), '[1,2,3]');
	});

	it("sublists should be derived from a list",function() {
		var obj = pc.parse1("(1 2 3)");
		assert.ok(obj.isList());
		assert.ok(obj.isCons());
		assert.ok(!obj.isAtom());
		assert.equal(JSON.stringify(obj.toJS()),'[1,2,3]');
		assert.equal(JSON.stringify(obj.getCar().toJS()),'1');
		var cdr1 = obj.getCdr();
		assert.equal(JSON.stringify(cdr1.toJS()),'[2,3]');
		assert.equal(JSON.stringify(cdr1.getCar().toJS()),'2');
		assert.equal(JSON.stringify(cdr1.getCdr().toJS()),'[3]');
	});

	it("cons should be derived from a list",function() {
		var obj = pc.parse1("(1 2 . 3)");
		assert.ok(!obj.isList());
		assert.ok(obj.isCons());
		assert.ok(!obj.isAtom());
		assert.equal(JSON.stringify(obj.toJS()),'[1,2,3]');
		var cdr1 = obj.getCdr();
		assert.equal(JSON.stringify(cdr1.toJS()),'[2,3]');
		assert.equal(JSON.stringify(cdr1.getCar().toJS()),'2');
		assert.equal(JSON.stringify(cdr1.getCdr().toJS()),'3');
	});

	it("alist should be translated into JS Object",function() {
        var v1 = pc.parse1("((a . 1) (b))");
        assert.ok(v1.isAlist());
        var v2 = pc.parse1("((a . 1) b)");
        assert.ok(!v2.isAlist());

		var obj = pc.parse1("( (a . 1) (b . \"xxx\") (c 3 4) (\"d\" . \"e\"))");
		assert.ok(obj.isList());
		assert.ok(obj.isAlist());
		var hash = obj.toObject();
		assert.equal(hash.a, 1);
		assert.equal(hash.b, "xxx");
		assert.deepEqual(hash.c, [3,4]);
		assert.equal(hash.d, "e");

		var obj2 = pc.parse1("((a . 1) b)");
		assert.throws(function() {
			obj2.toObject();
		}, /alist form/);
	});

	it("should parse multiple S-expressions.",function() {
		var objs = pc.parse("1 2 3");
		assert.equal(objs.length, 3);
		assert.equal(objs[0].toJS(),1);
		assert.equal(objs[1].toJS(),2);
		assert.equal(objs[2].toJS(),3);

		var objs2 = pc.parse("0 ((a . 1) b) \"xxx\" (1 (a . b) 2 . 3)");
		assert.equal(objs2.length, 4);
		assert.equal(objs2[0].toJS(), 0);
		assert.deepEqual(objs2[1].toJS(), [["a",1],"b"]);
		assert.equal(objs2[2].toJS(), "xxx");
		assert.deepEqual(objs2[3].toJS(), [1,["a","b"],2,3]);
	});
});

describe("Exception", function() {
	it("should throw an exception for wrong syntax.", function() {
		assert.throws(function() {
			pc.parse("([)]");
		},pc.SyntaxError);
	});
	
	it("should throw an exception for NaN,Inf.", function() {
		assert.throws(function() {
			var ret = pc.encode( parseInt("a"), true ); // NaN
			console.log(ret);
		},pc.SerializationError);
		assert.throws(function() {
			var ret = pc.encode( 1/0, true ); // Inf
			console.log(ret);
		},pc.SerializationError);
		assert.throws(function() {
			var ret = pc.encode( -1/0, true ); // -Inf
			console.log(ret);
		},pc.SerializationError);
	});
	
	it("should throw an exception for wrong objects.", function() {
		assert.throws(function() {
			var ret = pc.encode( new Date() , true);
			console.log(ret);
		},pc.SerializationError);
		assert.throws(function() {
			var ret = pc.encode( function() {} , true);
			console.log(ret);
		},pc.SerializationError);
		assert.throws(function() {
			var ret = pc.encode( /abc/ , true);
			console.log(ret);
		},pc.SerializationError);
		assert.throws(function() {
			var ret = pc.encode( new Error("abc") , true);
			console.log(ret);
		},pc.SerializationError);
	});
});

describe("Performance", function() {
	it("should evaluate large S-expressions.",function() {
		var size = 100000;
		var org = [];
		for (var i = 0; i < size; i++) {
			org.push(Math.random()*10000);
		}
		var sumf = function(a,b) {return a+b;};
		var sum = org.reduce(sumf, 0);
		var sexp = "("+org.join(" ")+")";
		var obj = pc.parse1(sexp).toJS();
		assert.equal(obj.length, size);
		assert.equal(sum, obj.reduce(sumf,0));
	});
});

describe("Stringify",function() {

	it("should make a sexp string from a simple AST.",function() {
		var org = "(1 1.2 \"AAA\" a b 'c nil)";
		var obj = pc.parse1(org);
		assert.equal(obj.toStr(),org);
	});

	it("should pass SExpAbstract objects.", function() {
		var msym = pc.ast.SExpSymbol;
		var mcons = pc.ast.SExpCons;
		var mnum = pc.ast.SExpNumber;
		var obj = [1, new msym("abc"), new mcons(new msym("a"), mnum.intVal(2))];
		assert.equal(pc.encode(obj), "(1 abc (a . 2))");
	});

	it("should make a sexp string from some list ASTs.",function() {
		var org,obj;
		org = "(+ 1 2 (- 2 (* 3 4)))";
		obj = pc.parse1(org);
		assert.equal(obj.toStr(),org);

		org = "(((1)))";
		obj = pc.parse1(org);
		assert.equal(obj.toStr(),org);

		org = "(1 (a . b) 2 . 3)";
		obj = pc.parse1(org);
		assert.equal(obj.toStr(),org);
	});

	it("should encode JS objects.", function() {
		var org = [1, 1.2, -4, "xxx", true, null];
		var dst = pc.encode(org);
		var expected = "(1 1.2 -4 \"xxx\" t nil)";
		assert.equal(dst, expected);

		org = [];
		dst = pc.encode(org);
		expected = "nil";
		assert.equal(dst, expected);
		
		org = [1,[2,[3,4]]];
		dst = pc.encode(org);
		expected = "(1 (2 (3 4)))";
		assert.equal(dst, expected);

		org = {a:"b", c:"d"};
		dst = pc.encode(org);
		expected = "((\"a\" . \"b\") (\"c\" . \"d\"))";
		assert.equal(dst, expected);

		org = {a:[1,2,3], b:{c: [4,5,6]}, d:[]};
		dst = pc.encode(org);
		expected = "((\"a\" 1 2 3) (\"b\" (\"c\" 4 5 6)) (\"d\"))";
		assert.equal(dst, expected);
	});

});
