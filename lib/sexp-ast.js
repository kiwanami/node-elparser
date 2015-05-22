// -*- coding: utf-8; -*-

"use strict";

//==================================================
// AST Data holders

function SExpAbstract() {}
SExpAbstract.prototype.isAtom = function() {return false;};
SExpAbstract.prototype.isCons = function() {return false;};
SExpAbstract.prototype.isList = function() {return false;};
SExpAbstract.prototype.isAlist = function() {return false;};
SExpAbstract.prototype.visit  = function(f) {throw "Not implemented!";}; // for value mapping
SExpAbstract.prototype.toJS = function() {throw "Not implemented!";};

function SExpAbstractAtom() {}
SExpAbstractAtom.prototype = new SExpAbstract();
SExpAbstractAtom.prototype.isAtom = function() { 
	return true;
};

function SExpNil() {}
SExpNil.prototype = new SExpAbstractAtom();
SExpNil.prototype.toStr = function() {
	return "nil";
};
SExpNil.prototype.isList = function() {	return true; };
SExpNil.prototype.visit = function() {};
SExpNil.prototype.toJS = function() {return null;};

// s: Symbol name
function SExpSymbol(s) {
	this.symbol = s;
}
SExpSymbol.prototype = new SExpAbstractAtom();
SExpSymbol.prototype.toStr = function() {
	return this.symbol;
};
SExpSymbol.prototype.toJS = function() {
	return this.symbol; // just return a symbol-name as string.
};

// str: String Value
function SExpString(str) {
	this.string = str;
}
SExpString.prototype = new SExpAbstractAtom();
SExpString.prototype.toStr = function() {
	return JSON.stringify(this.string);
};
SExpString.prototype.toJS = function() {
	return this.string;
};

// val: value
var INTEGER = {type:"int"};
var FLOAT   = {type:"float"};
function SExpNumber(type, val) {
	this.type = type;
	this.val = val; // string
}
SExpNumber.intVal = function(val) {
	return new SExpNumber(INTEGER, val);
};
SExpNumber.floatVal = function(val) {
	return new SExpNumber(FLOAT, val);
};
SExpNumber.prototype = new SExpAbstractAtom();
SExpNumber.prototype.toInt = function() {
	return parseInt(this.val,10);
};
SExpNumber.prototype.toFloat = function() {
	return parseFloat(this.val);
};
SExpNumber.prototype.toStr = function() {
	return this.val;
};
SExpNumber.prototype.toJS = function() {
	switch(this.type) {
	case INTEGER:
		return this.toInt();
	case FLOAT:
		return this.toFloat();
	}
	throw "Unknow SExpNumber type: "+this.type+" for "+this.val;
};

function SExpAbstractCons() {}
SExpAbstractCons.prototype = new SExpAbstract();
SExpAbstractCons.prototype.isCons = function() {return true;};


// sexps: [sexp]
function SExpList(list) {
	this.list = list;
}
SExpList.prototype = new SExpAbstractCons();
SExpList.prototype.getCar = function() {return this.list[0];};
SExpList.prototype.getCdr = function() {
	if (this.list.length < 2) return null;
	return new SExpList(this.list.slice(1));
};
SExpList.prototype.isList = function() {return true;};
SExpList.prototype.toStr = function() {
	if (this.list.length == 0) return "nil";
	return "("+this.list.map(function(i) {
		return i.toStr();
	}).join(" ")+")";
};
SExpList.prototype.visit = function(f) {
	this.list = this.list.map(f);
};
SExpList.prototype.isAlist = function() {
	for (var i = 0; i < this.list.length; i++) {
		if (!this.list[i].isCons()) return false;
	}
	return true;
};
SExpList.prototype.toJS = function() {
	return this.list.map(function(i) { return i.toJS(); });
};
SExpList.prototype.toObject = function() {
	var ret = {};
	this.list.forEach( function(item) {
		if (!item.isCons()) throw "\""+item.toStr()+"\" is not alist form in ["+this.toStr()+"]";
		ret[item.getCar().toJS()] = item.getCdr().toJS();
	}, this);
	return ret;
};

// t1: term1, t2: term2
function SExpCons(t1, t2) {
	this.car = t1;
	this.cdr = t2;
}
SExpCons.prototype = new SExpAbstractCons();
SExpCons.prototype.isCons = function() {return true;};
SExpCons.prototype.getCar = function() {return this.car;};
SExpCons.prototype.getCdr = function() {return this.cdr;};
SExpCons.prototype.toStr = function() {
	if (this.cdr.isList() && this.cdr.list.length == 0) return "("+this.car.toStr()+")";
	if (this.cdr.isList() && this.cdr.list.length > 0) {
		return "("+this.car.toStr()+" "+this.cdr.list.map(function(i) {
			return i.toStr();
		}).join(" ")+")";
	}
	return "("+this.car.toStr()+" . "+this.cdr.toStr()+")";
};
SExpCons.prototype.visit = function(f) {
	this.car = f(this.car);
	this.cdr = f(this.cdr);
};
SExpCons.prototype.toJS = function() {
	return [this.car.toJS(), this.cdr.toJS()];
};

// (list . last)
function SExpListDot(list,last) {
	this.list = list;
	this.last = last;
}
SExpListDot.prototype = new SExpAbstractCons();
SExpListDot.prototype.getCar = function() {return this.list[0];};
SExpListDot.prototype.getCdr = function() {
	var len = this.list.length;
	if (len == 2) {
		return new SExpCons(this.list[1],this.last);
	}
	return new SExpListDot(this.list.slice(1),this.last);
};
SExpListDot.prototype.isList = function() {return false;};
SExpListDot.prototype.toStr = function() {
	return "("+this.list.map(function(i) {
		return i.toStr();
	}).join(" ")+" . "+this.last.toStr()+")";
};
SExpListDot.prototype.visit = function(f) {
	this.list = this.list.map(f);
	this.last = f(this.last);
};
SExpListDot.prototype.toJS = function() {
	var ret = this.list.map(function(i) { return i.toJS(); });
	ret.push(this.last.toJS());
	return ret;
};

// sexp: sexp
function SExpQuoted(sexp) {
	this.qsexp = sexp;
}
SExpQuoted.prototype = new SExpAbstract();
SExpQuoted.prototype.toStr = function() {
	return "'"+this.qsexp.toStr();
};
SExpQuoted.prototype.visit = function(f) {
	this.qsexp.visit(f);
};
SExpQuoted.prototype.toJS = function() {
	return [this.qsexp.toJS()];
};

module.exports = {
	SExpAbstract: SExpAbstract,
	SExpNumber: SExpNumber,   SExpList: SExpList,
	SExpCons: SExpCons,       SExpSymbol:SExpSymbol,
	SExpString: SExpString,   SExpQuoted:SExpQuoted,
	SExpListDot: SExpListDot, SExpNil:SExpNil
};
