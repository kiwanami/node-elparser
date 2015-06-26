// -*- coding: utf-8; -*-

"use strict";

var parser = require('./elsexp');
var ast = require('./sexp-ast');

function subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
}

function SerializationError(message) {
	this.message = message;
}

subclass(SerializationError, Error);

Number.isFinite = Number.isFinite || function(value) {
    return typeof value === "number" && isFinite(value);
}



/**
 * @param {string} string S-expression text
 * @return {SExpAbstract[]} S-expression AST objects
 */
function parseSexp(string) {
	return parser.parse(string.trim());
}

/**
 * @param {string} string S-expression text
 * @return {SExpAbstract} S-expression AST objects
 */
function parseSexp1(string) {
	return parseSexp(string)[0];
}



/**
 * @param {Object|Array} obj JavaScript object to serialize
 * @param {boolean} [throwException] if true, this function throws an exception for not-serializable objects.
 * @return {string} S-expression text
 */
function encode(obj, throwException) {
	return _encode(obj, throwException).toStr();
}

function _encode(obj, throwException) {
 	if (obj === null || obj === undefined) return new ast.SExpNil();
	if (Number.isNaN(obj) && throwException) throw new SerializationError("NaN can not be encoded.");
	var escMap = {'"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'};
	var type = typeof(obj);
	if (type == "string" || obj instanceof String) {
		return new ast.SExpString(obj.replace(/[\\"\u0000-\u001F\u2028\u2029]/g, function (m) {
			return escMap[m] || '\\u'+(m.charCodeAt(0)+0x10000).toString(16).substr(1);
		}));
	} else if (type == "number" || obj instanceof Number) {
		if (isFinite(obj))
			return (obj % 1 === 0) ? 
				new ast.SExpNumber.intVal(obj) : 
				new ast.SExpNumber.floatVal(obj);
		else if (throwException) throw new SerializationError("Infinite can not be encoded.");
		else return new ast.SExpNil();
	} else if (type == "boolean" || obj instanceof Boolean) {
		return obj ? 
			new ast.SExpSymbol("t") : new ast.SExpNil();
	} else if (Array.isArray(obj)) {
		return new ast.SExpList(obj.map(function(i) {
			return _encode(i,throwException);
		}));
	} else if (obj instanceof ast.SExpAbstract) {
		return obj; // pass as is
	} else if (obj instanceof Date   ||
			   obj instanceof RegExp ||
			   obj instanceof Error  ||
			   obj instanceof Function) {
		// do nothing
	} else if (obj instanceof Object) {
		var items = [];
		for (var i in obj) {
			items.push(new ast.SExpCons(_encode(i, throwException), _encode(obj[i], throwException)));
		}
		return new ast.SExpList(items);
	}
	if (throwException) throw new SerializationError("Unknown object type:"+obj.toString()+"/"+(typeof obj));
	console.log("WARN: Unknown object type:",obj);
	// default object
	return new ast.SExpString(obj.toString());
}

/**
 * @param {Array} obj JavaScript objects to serialize
 * @param {string} [sep=" "] separate string
 * @param {boolean} [throwException] if true, this function throws an exception for not-serializable objects.
 * @return {string} S-expression text
 */
function encodeMult(objs, sep, throwException) {
	if (!sep) sep = " ";
	return objs.map(function(i) {
		return encode(i, throwException);
	}).join(sep);
}

module.exports = {
	parse: parseSexp, parse1: parseSexp1,
	encode: encode, encodeMult: encodeMult,
	ast: ast,
	SyntaxError: parser.SyntaxError,
	SerializationError: SerializationError
};
