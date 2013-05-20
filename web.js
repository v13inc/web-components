//
// Misc helpers
//

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

var getter = function(proto, name, func) {
  Object.defineProperty(proto, name, { get: func })
  return func;
}

var cloneElement = function(name, elem) {
 var newElem = document.createElement(elem.nodeName.toLowerCase());
 newElem.attributes = elem.attributes;
 return newElem;
}

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
