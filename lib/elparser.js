// -*- coding: utf-8; -*-

"use strict";

var parser = require('./elsexp');
var ast = require('./sexp-ast');

function parseSexp(string) {
	return parser.parse(string);
}

function parseSexp1(string) {
	return parseSexp(string)[0];
}



function encode(obj) {
	return _encode(obj).toStr();
}

function _encode(obj) {
 	if (obj == null || obj == undefined) return new ast.SExpNil();
	var escMap = {'"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'};
	switch (typeof(obj)) {
	case "string":
		return new ast.SExpString(obj.replace(/[\\"\u0000-\u001F\u2028\u2029]/g, function (m) {
			return escMap[m] || '\\u'+(m.charCodeAt(0)+0x10000).toString(16).substr(1);
		}));
	case "number":
		if (isFinite(obj))
			return (obj % 1 === 0) ? 
				new ast.SExpNumber.intVal(obj) : 
				new ast.SExpNumber.floatVal(obj);
		else 
			return new ast.SExpNil();
	case "boolean":
		return obj ? 
			new ast.SExpSymbol("t") :
			new ast.SExpNil();
	case "object":
		if (obj instanceof Array) {
			return new ast.SExpList(obj.map(_encode));
		} else if (obj instanceof Object) {
			var items = [];
			for (var i in obj) {
				items.push(new ast.SExpCons(_encode(i), _encode(obj[i])));
			}
			return new ast.SExpList(items);
		}
	}
	console.log("WARN: Unknown object type:",obj);
	// default object
	return new ast.SExpString(obj.toString());
}

function encodeMult(objs, sep) {
	if (!sep) sep = " ";
	return objs.map(encode).join(sep);
}

module.exports = {
	parse: parseSexp, parse1: parseSexp1,
	encode: encode, encodeMult: encodeMult
};
