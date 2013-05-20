//
// Misc helpers
//

var toArray = function(arrayLike) { return [].slice.call(arrayLike) }

var isProperty = function(obj, key) {
  if(Array.isArray(obj) && key == 'length') return false; // for some reason length likes to show up in array loops
  return obj && obj.hasOwnProperty && obj.hasOwnProperty(key);
}

var each = function(list, callback) {
  // let's shoehorn some map functionality in here too
  var newList = [];
  for(var key in list) {
    if(isProperty(list, key)) newList.push(callback(list[key], key));
  }
  return newList;
}

var extend = function(obj) {
  each(Array.prototype.slice.call(arguments, 1), function(source) {
    if (source) for (var prop in source) obj[prop] = source[prop];
  });

  return obj;
};

var bind = function(func, context) { return function() { return func.apply(context, arguments) }}

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

var mixin = function(MixinClass, NewClass) {
  // Mixes an object into a class prototype, or an object
  var MixedObj = extend(NewClass.prototype || NewClass || {}, MixinClass.prototype || MixinClass);
  if(!NewClass.prototype) var NewClass = MixedObj; // return the new object if NewClass doesn't have a prootype
  else NewClass.prototype = MixedObj;

  return NewClass;
}

var cloneElement = function(name, elem) {
 var newElem = document.createElement(elem.nodeName.toLowerCase());
 newElem.attributes = elem.attributes;
 return newElem;
}

var capitalize = function(str) { return str[0].toUpperCase() + str.slice(1); }

var camelJoin = function() {
  var args = toArray(arguments);
  var capitalized = each(args, function(arg) { return capitalize(arg) });
  capitalized[0] = capitalized[0].toLowerCase();
  return capitalized.join('');
}

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
// DataMapper
//

var WrappedProperty = mixin(EventHandler, function(obj, propertyName) {
  this.obj = obj;
  this.propertyName = propertyName;
  this.value = this.obj[this.propertyName];

  getter(obj, propertyName, this.get, this);
  setter(obj, propertyName, this.set, this);
})

var WP = WrappedProperty.prototype;

WP.get = function() {
  var val = this.value;
  // cover your eyes!! (we need to wrap the val in an object if it's properties are read-only)
  if((val.___temp___ = 'temp') != val.__temp__) var val = Object(val);
  delete val.___temp___;
  // add a reference to this wrapper
  val.wrapper = this;

  return val;
}

WP.set = function(val) {
  this.value = val;
  this.dispatchEvent('change', this.get());

  return this.get();
}

Object.prototype.wrapProperty = function(propertyName) {
  return new WrappedProperty(this, propertyName);
}

TT = {one: 1, two: 2}
TT.wrapProperty('one');
TT.one.wrapper.addEventListener('change', function(val) { console.log('change', val) });
TT.one = 2

// 
// ElementClassFactory
//

var ElementClassFactory = function(elementName, constructor) {
  var NewClass = extend({}, BaseElement);
  // make sure we actually copy a new prototype
  NewClass.prototype = extend(NewClass.prototype || {}, BaseElement.prototype);
  NewClass.elementName = elementName;
  ElementClassFactory.elementClasses.push(NewClass)

  return NewClass;
}

ElementClassFactory.elementClasses = [];

ElementClassFactory.registerClasses = function() {
  each(this.elementClasses, function(ElementClass) { ElementClass.register() });
}

// 
// BaseElement
//

var BaseElement = function() {};

BaseElement.register =  function() {
  document.register(this.elementName, { prototype: Object.create(this.prototype) });
}
var BE = BaseElement.prototype = extend(BaseElement.prototype, HTMLElement.prototype);

BE.readyCallback = function() {
  if(this.render) this.render();
}

//
// RenderedElement
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

RE.initDataMaps = function() {
  var self = this;
  each(this.elementQueryAll('data-map'), function(dataMap, key) {
    if(dataMap.mapData) {
      dataMap.mapData(self.shadowRoot);
      dataMap.mapData(self);
    }
  });
}

RE.elementQuery = function(query) { return this.customElement.querySelector(query); }
RE.elementQueryAll = function(query) { return this.customElement.querySelectorAll(query); }

RE.getPublic = getter(RE, 'public', function() { return this.elementQuery('template') })
RE.getPrivate = getter(RE, 'private', function() { return this.elementQuery('template[shadow]') })

// 
// DataElement
//

// wrap in ElementClass so DataElement.register gets called at appropiate time
var DataElement = ElementClassFactory('data');
var DE = DataElement.prototype;

// static functions
DataElement.eval = function(data, context, closure) { 
  var func = new Function('closure', 'with(closure) return ' + data.trim()); 
  return func.call(context || this, closure || {}); 
}

DE.evalData = function() {
  return DataElement.eval(this.innerText);
}

DE.render = function() {
  this.data = this.evalData();
}

// 
// DataMapElement
//
var DataMapElement = ElementClassFactory('data-map');
var DME = DataMapElement.prototype;

DME.evalData = function(container) {
  var data = this.ownerDocument.querySelector(this.attributes.data.textContent).evalData();
  var map = DataElement.eval(this.innerText, container || this.ownerDocument, data);

  return map
}

DME.mapData = function(container) {
  var self = this;
  each(self.evalData(container), function(value, selector) {
    var mapFunc = Array.isArray(value) ? self.mapArray : self.map;
    mapFunc(value, selector, container);
  });
}

DME.map = function(value, selector, container) {
  var el = container.querySelector(selector);
  if(el) el.innerText = value;
}

DME.mapArray = function(values, selector, container) {
  var el = container.querySelector(selector);
  if(el) each(values, function(value) {
    var clonedEl = el.cloneNode(el);
    clonedEl.innerText = value;
    el.parentNode.insertBefore(clonedEl, el);
  });
}

// 
// WebComponents
//

var WebComponents = {}, WC = WebComponents;

WC.elements = [];

WC.init = function() {
  each(document.querySelectorAll('link[type=web-element]'), WC.initLink);
}

WC.initLink = function(link) {
  if(link && link.nodeType) {
    WC.elements.push(link.content.querySelector('element'));
  }
}

WC.registerElements = function() {
  each(this.elements, function(elem) {
    var name = elem.attributes.name.textContent;
    RenderedElement.register(name, elem);
    // reinsert existing elements to force a rerender
    each(document.getElementsByTagName(name), function(oldElem) {
      if(oldElem.nodeType) oldElem.parentNode.replaceChild(cloneElement(name, oldElem), oldElem);
    });
  });
}

// 
// Init
//

window.addEventListener('HTMLImportsLoaded', function() {
  ElementClassFactory.registerClasses();
  WebComponents.init();
  WebComponents.registerElements();
});
