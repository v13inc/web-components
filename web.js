//
// Web Components Framework proof-of-concept
//
// Copyright 2013, Sean Clark
// sean@v13inc.com
//
// If you make any modifications to this code, or use it for inspiration for any new frameworks or
// projects, please send me a ping so I can check it out -- and  feel free to stick my name in a 
// comment somewhere if you feel I deserve it :D
//

//
// Misc helpers
//

// returns a string with the object type (a more specific version of typeof)
var getType = function(obj) {
  var objType;
  each('element array string number object'.split(' '), function(typeName) {
    if(!objType && window[camelJoin('is', typeName)](obj)) objType = typeName;
  });

  return objType || 'undefined';
}

// Type checkers
var isElement = function(obj) { return obj && obj.nodeType }
var isArray = function(obj) { return Array.isArray(obj) }
var isString = function(obj) { return obj === String(obj) }
var isNumber = function(obj) { return obj === Number(obj) }
var isObject = function(obj) { return typeof obj === 'object' } // TODO: find a more exclusive test for this
var isEnumerable = function(obj, key) {
  if(obj == null) return false;
  if(Array.isArray(obj) && key == 'length') return false; // for some reason length likes to show up in array loops
  return ( obj.propertyIsEnumerable && obj.propertyIsEnumerable(key) ) ||
         ( obj.hasOwnProperty && obj.hasOwnProperty(key) )
}

// Type convertors
var toArray = function(arrayLike) { return [].slice.call(arrayLike) }

// Combined each and map function
var each = function(list, callback) {
  // let's shoehorn some map functionality in here too
  var newList = [];
  for(var key in list) {
    if(isEnumerable(list, key)) newList.push(callback(list[key], key));
  }
  return newList;
}

// Returns the first parameter after copying all the properties from subsequent parameters to it
var extend = function(obj) {
  each(Array.prototype.slice.call(arguments, 1), function(source) {
    if(source) for (var prop in source) obj[prop] = source[prop];
  });

  return obj;
};


// Using extend, copies all available properties from MixinClass to NewClass. If NewClass has a prototype,
// then MixinClass is copied to the NewClass.prototype. If MixinClass has a prototype, then the properies
// are copied from MixinClass.prototype. This makes mixin() flexible enough to be used with normal and
// static classes, or basic objects.
var mixin = function(MixinClass, NewClass) {
  var MixedObj = extend(NewClass.prototype || NewClass || {}, MixinClass.prototype || MixinClass);
  if(!NewClass.prototype) var NewClass = MixedObj; // return the new object if NewClass doesn't have a prootype
  else NewClass.prototype = MixedObj;

  return NewClass;
}

// Returns a new function that will always call func with context as 'this'
var bind = function(func, context) { return function() { return func.apply(context, arguments) }}

//
// getter / setter
//
// Adds a new getter or setting function to proto, and returns the getter/setter function. Context is optional;
// if it is passed, the getter/setter function will be bound to context.
// The getter/setter syntax is useful for defining getters inline with class definitions.
//
//  Eg. MyClass.prototype = getter(MyClass.prototype, 'myProperty', function() { return 'FooBar' })
//
var getter = function(proto, name, func, context) {
  if(context) var func = bind(func, context);
  Object.defineProperty(proto, name, { get: func })
  return func;
}

var setter = function(proto, name, func, context) {
  if(context) var func = bind(func, context);
  Object.defineProperty(proto, name, { set: func })
  return func;
}

// Returns a clone of elem. This current is quite naive, and only copies the attibrutes and tag name.
var cloneElement = function(elem) {
 var newElem = document.createElement(elem.nodeName.toLowerCase());
 newElem.attributes = elem.attributes;
 return newElem;
}

var capitalize = function(str) { return str[0].toUpperCase() + str.slice(1); }

// joins all the arguments into a single "camelCase" string (the first argument is not touched).
var camelJoin = function() {
  var args = toArray(arguments);
  var capitalized = each(args, function(arg) { return capitalize(arg) });
  capitalized[0] = capitalized[0].toLowerCase();
  return capitalized.join('');
}

// 
// EventHandler class
//
// Bare bones event handler
//
var EventHandler = function() {}
var EH = EventHandler.prototype;

EH.dispatchEvent = function() {
  var args = toArray(arguments);
  var eventName = args.shift(1);
  each(this.getListeners(eventName), function(listenerInfo) {
    listenerInfo.callback.apply(listenerInfo.context, args);
  });
}

EH.addEventListener = function(eventName, callback, context) {
  var listeners = this.getListeners(eventName);
  listeners.push({ callback: callback, context: context });
}

EH.getListeners = function(eventName) {
  this.listeners = this.listeners || {};
  return this.listeners[eventName] || (this.listeners[eventName] = []);
}

// 
// Binders
//
// A static class that organized functions used to bind values and elements together, which will
// propogate all changes between them.
//
// This is currently a very basic proof-of-concept, and only propogates changes in one direction.
// It also relies on a common event handling interface on the value being bound to listen for changes.
//

var Binders = {};

//
// Binders.bind(wrappedValue, backkback, [context])
//
// Binds wrappedValue to callback. Callback will be called with the new value of wrappedValue as the first
// parameter whener wrappedValue changes.
//
// Once again, this is proof-of-concept territory. Currently this only listens for the 'change' event on
// wrappedValue, and all event callbacks must supply the new value as the first parameter.
//
Binders.bind = function(wrappedValue, callback, context) {
  if(context) var callback = bind(callback, context);
  wrappedValue.addEventListener('change', callback);
  // set the initial value
  callback(wrappedValue);
}

// Shortcut for Binder.bind that binds a wrappedValue to an element's innerText
Binders.bindToElement = function(wrappedValue, element) {
  Binders.bind(wrappedValue, function(val) { element.innerText = val });
}

// 
// Wrappers
//
// These classes wrap different types of objects with a common interface that is used
// to "bind" objects together, and propogate changes.
//

// WrappedValue is a basic read-only wrapper that wraps a basic value.
var WrappedValue = mixin(EventHandler, function(val) {
  this.value = val;
});

var WV = WrappedValue.prototype;

// toString is the common "interface" to convert a wrapped object to a value
WV.toString = function() {
  return String(this.value);
}

// WrappedElement wraps elements and manages different 'getter' functions to convert different element
// types to values.
var WrappedElement = mixin(String, function(elem) {
  this.elem = elem;
});

// Manage 'getter' functions that convert different types of elements to values
WrappedElement.getters = {}; 

// WrappedElement.createGetter('p h1 div', function() { ... })
// Splits the first parameter by spaces into a list of element names, then addes the supplied function as 
// a getter for each element name. This should save a ton of boilerplate when defining element getters.
WrappedElement.createGetter = function(elementNames, getter) {
  each(elementNames.split(' '), function(elementName) {
    WrappedElement.getters[String(elementName).toLowerCase()] = getter;
  });
}

// returns a getter for the supplied element type, or the default if none exists
WrappedElement.getGetter = function(elementName) {
  return WrappedElement.getters[String(elementName).toLowerCase()] || WrappedElement.defaultGetter;
}

// The default getter returns the trimmed 'innerText' of the wrapped element
WrappedElement.defaultGetter = function() { return this.elem.innerText.trim(); }
// Wrapped input elements turn the 'value' DOM property
WrappedElement.createGetter('input', function() { return this.elem.value });

var WE = WrappedElement.prototype;

// Adds an event listener to the wrapped element, and normalized the callback so the change value is the first paramater
WE.addEventListener = function(eventName, callback) { 
  var listener =  function(event) {
    callback.call(event.target || this, new WrappedElement(event.target));
  }
  return this.elem.addEventListener(eventName, listener);
}

// Delegates to the wrapped elements dispatchEvent
WE.dispatchEvent = function() { return this.elem.dispatchEvent.apply(this.elem, arguments) }

// Look up the appropriate getter for this element type, and use it to return a string value
WE.toString = function() {
  // grab the val using the appropiate getter for this tag
  var val = WrappedElement.getGetter(this.elem.nodeName).call(this);
  return String(val);
}

// 
// ElementClassFactory
//
// This is a helper function that makes it easier to create new classes that act as elements. New elements
// are tracked and only registered when ElementClassFactory.registerClasses is called.
//
var ElementClassFactory = function(elementName, constructor) {
  var NewClass = extend({}, BaseElement); // inherit from BaseElement
  // make sure we actually copy a new prototype
  NewClass.prototype = extend(NewClass.prototype || {}, BaseElement.prototype);
  NewClass.elementName = elementName;
  ElementClassFactory.elementClasses.push(NewClass); // track the new element for later registration

  return NewClass;
}

ElementClassFactory.elementClasses = [];

ElementClassFactory.registerClasses = function() {
  each(this.elementClasses, function(ElementClass) { ElementClass.register() });
}

// 
// BaseElement
//
// Base class for custom elements.
//

var BaseElement = function() {};

// Registers the current element with the DOM. Uses myBaseElement.elementName as the name of the new element.
BaseElement.register = function() {
  document.register(this.elementName, { prototype: Object.create(this.prototype) });
}
var BE = BaseElement.prototype = extend(BaseElement.prototype, HTMLElement.prototype);

// Call the render function when we are ready to render the contents of the custom element
BE.readyCallback = function() {
  if(this.render) this.render();
}

//
// RenderedElement
//
// RenderedElement is a bit of a misnomer -- it is a base class used to wrap the <element> tag that defines
// new custom elements. The rendered element is a common place to for the light and shadow dom to access hidden
// elements in <element>.
//
// When the new custom element is rendered, RenderedElement will use the first non-shadow <template> tag for the
// contents of the 'light' DOM, and the contents of <template shadow> (if it exists) as the contents of the
// 'shadow' DOM.
//
// Note: This is probably not the best solution, since the <content select="#mySelector"></content> tag will only
// select elements that are immediate decendants of <element>. I sort of feel that having a <template> that is
// used to render the shadow DOM as part of the light DOM breaks the encapsulation of the custom element. I'm not
// sure of a solution to this dilemna, though.
//

var RenderedElement = function(customElement) {
  this.customElement = customElement;
}

var RE = RenderedElement.prototype = extend(RenderedElement.prototype, BaseElement.prototype)

RenderedElement.register = function(name, elem) {
  var renderedElement = new RenderedElement(elem);
  document.register(name, { prototype: renderedElement });
}

RE.createShadowRoot = function() {
  return HTMLElement.prototype.webkitCreateShadowRoot.call(this);
}

RE.render = function() {
  this.shadowRoot = this.shadowRoot || this.createShadowRoot(); 
  this.shadowRoot.innerHTML = this.private.innerHTML;
  this.innerHTML = this.public.innerHTML;
}

RE.insertedCallback = function() {
  this.initDataMaps();
}

// Loop up any data-map elements, and initialize them. I'd like to somehow remove this from the RenderedElement
// class and have data-map elements auto-initialize themselves.
RE.initDataMaps = function() {
  var self = this;
  each(this.elementQueryAll('data-map'), function(dataMap, key) {
    if(dataMap.mapData) {
      dataMap.mapData(self.shadowRoot);
      dataMap.mapData(self);
    }
  });
}

// Query selectors in the <element> tag
RE.elementQuery = function(query) { return this.customElement.querySelector(query); }
RE.elementQueryAll = function(query) { return this.customElement.querySelectorAll(query); }

// getPublic returns the first <template> tag without a 'shadow' attribute
RE.getPublic = getter(RE, 'public', function() { return this.elementQuery('template') })
// getPrivate returns the first <template shadow> tag
RE.getPrivate = getter(RE, 'private', function() { return this.elementQuery('template[shadow]') })

// 
// DataElement
//
// <data> elements are a neat way to reference JSON (or javascript-like) data. Currently it's a bit of a hack,
// and uses the Function constructor to evaluate the <data> innerText. The innerText is appended to a return
// statement, so the innerText ends up being a JSON-like format.
//
// I think <data> elements would be a really handy way to reference external (or inline) data. Eventually I'd
// like to add support for a 'src' or 'href' attributes that will pull JSON data from REST APIs. Also, it seems
// natural to support different data formats like XML.
//

var DataElement = ElementClassFactory('data');
var DE = DataElement.prototype;

// Evaluates the <data> innerText and returns it's parsed value. Context is used as the value of 'this' inside
// the <data> tag, and a with statement is used to evaluate the data inside of the closure context.
DataElement.eval = function(data, context, closure) { 
  var func = new Function('closure', 'with(closure) return ' + data.trim()); 
  return func.call(context || this, closure || {}); 
}

// Shortcut to call DataElement.eval with the current innerText
DE.evalData = function() {
  return DataElement.eval(this.innerText);
}

// Evaluate the innerText when the <data> element is ready
DE.render = function() {
  this.data = this.evalData();
}

// 
// DataMapElement
//
// The <data-map> element contains an object that is used to map data to elements. The keys of the object
// are selectors which are used to look up the target of the mapping, whose innerText is set to the value. Before
// the value is copied to the innerText of the target element, it is wrapped in a common interface. This interface
// supplies a toString function that converts a wrapped value to a string, and event methods to track and dispatch
// events when the value changes.
//
// If the <data-map data="#selector"> element has a 'data' attribute, it's value is used to look up a <data>
// element. The <data> element is then evaluated, and the data is used as the global context for <data-map>.
//
// This is a companion to the <data> element. It is evaluated using the same method as the <data> innerText,
// and 'this' is mapped to the root of <element>, so elements can be queried with this.querySelector(...).
//

var DataMapElement = ElementClassFactory('data-map');

// Track different 'mapper' functions that convert different types to string values that are used for
// the target element's innerText.
DataMapElement.getMapper = function(value) {
  return DataMapElement.mappers[getType(value)] || DataMapElement.defaultMapper;
}
DataMapElement.defaultMapper = function(value) { this.innerText = value }
// Mapper callbacks are called with the target element as 'this', and the raw value as the first parameter
DataMapElement.mappers = {
  'element': function(value) { 
    // Wrap the value and bind it to the target element, so any changes are automatically propogated
    Binders.bindToElement(new WrappedElement(value), this);
  },
  'array': function(values) { 
    // if the value is an array, duplicate the target element for each item in the array
    var el = this;
    each(values, function(value) {
      var clonedEl = el.cloneNode(el);
      clonedEl.innerText = value;
      // use our nifty bindToElement function to automatically propogate changes
      Binders.bindToElement(new WrappedValue(value), clonedEl);
      el.parentNode.insertBefore(clonedEl, el);
    })
  }
}

var DME = DataMapElement.prototype;

// Evaluate the contents of <data-map>, using container as 'this'
DME.evalData = function(container) {
  var data = this.attributes.data ? this.ownerDocument.querySelector(this.attributes.data.textContent).evalData() : null;

  // evaluate the contents of <data-map>, using the supplied container or the owener document as 'this',
  // and use the evaluated data referenced by the data attribute as the global context (or window if the
  // data attribute doesn't exit)
  var map = DataElement.eval(this.innerText, container || this.ownerDocument, data || window);

  return map
}

// Evaluate the contents of <data-map>, then map the values to the target elements
DME.mapData = function(container) {
  var self = this;
  // loop through the keys and values of <data-map>
  each(self.evalData(container), function(value, selector) {
    // lookup a 'mapper' function for this type of value
    var mapFunc = DataMapElement.getMapper(value);
    // use the key as a selector to look up the target element
    var el = container.querySelector(selector);
    // call the mapper to map the value to the target element
    if(el) mapFunc.call(el, value);
  });
}

// 
// WebComponents
//
// Static class to initialize and track custom web components.
//

var WebComponents = {}, WC = WebComponents;

WC.elements = [];

// Find and <link type='web-element'> elements, and initialize them as a custom element
WC.init = function() {
  each(document.querySelectorAll('link[type=web-element]'), WC.initLink);
  each(document.querySelectorAll('element[type=web-element]'), WC.initElement);
}

// Store a reference to the <link> element for later registration
WC.initLink = function(link) {
  if(link && link.nodeType) {
    WC.initElement(link.content.querySelector('element'));
  }
}

WC.initElement = function(elem) { WC.elements.push(elem) }

// Register each of the <link type='web-component'> elements
WC.registerElements = function() {
  each(this.elements, function(elem) {
    if(elem && elem.attributes) {
      var name = elem.attributes.name.textContent;
      RenderedElement.register(name, elem);
      // reinsert existing elements to force a rerender
      each(document.getElementsByTagName(name), function(oldElem) {
        if(oldElem.nodeType) oldElem.parentNode.replaceChild(cloneElement(oldElem), oldElem);
      });
    }
  });
}

// 
// Init
//

window.addEventListener('HTMLImportsLoaded', function() {
  // Basic class-only custom elements
  ElementClassFactory.registerClasses();
  // These two functions used to have to be called at different times
  WebComponents.init();
  WebComponents.registerElements();
});
