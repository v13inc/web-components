(function() {

//
// Misc helpers
//

var keys = function(obj) {
  var _keys = [];
  for(var key in obj) if(obj.hasOwnProperty(key)) _keys.push(key);
  return _keys;
}

var each = function(list, callback) {
  // let's shoehorn some map functionality in here too
  var newList = [];
  for(var key in list) {
    if(list.hasOwnProperty(key)) newList.push(callback(list[key], key));
  }
  return newList;
}

var ProcessingInstructions = {}, PI = ProcessingInstructions;

PI.immediateEval = function(type, content) {
  // immediate processing instructions are executed during the init phase
  if(PI.immediateTypes.indexOf(type) != -1) {
    PI.deferEval(type, content)();
  }
}

PI.deferEval = function(type, content) {
  return function() { PI.types[type](content) }
}

PI.immediateTypes = ['javascript', 'js'];

PI.types = {};

PI.types.javascript = PI.types.js = function(content) {
  (new Function(content))();
}

var CustomElementProto = function(customElementElement) {
  this.customElementElement = customElementElement;
}
var CEP = CustomElementProto.prototype;

CEP.readyCallback = function() {
  this.innerHTML = this.customElementElement.innerHTML;
}


var CustomElementElement = function(elem) {
  for(var key in this) {
    elem[key] = this[key];
  }

  elem.extractProcessingInstructions();
  document.register(elem.attributes.name.textContent, {
    prototype: new CustomElementProto(elem)
  });

  return elem;
}

var CEE = CustomElementElement.prototype;

CEE.parseProcessingInstruction = function(content) {
  var regex = /\?([\w-]+)((.|\n)*)\?/; // ?<type-name> <content> ?
  var match = String.prototype.match.call(content, regex);
  var type = match[1], content = match[2];
  ProcessingInstructions.immediateEval(type, content);
  return {
    type: type,
    content: content,
    eval: ProcessingInstructions.deferEval(type, content)
  }
}

CEE.extractProcessingInstructions = function() {
  this.processingInstructions = this.processingInstructions || [];

  var self = this;
  var find = function(root) {
    if(!root || !root.childNodes || root.nodeType == self.TEXT_NODE) return;

    each(root.childNodes, function(node) {
      if(node.nodeType == self.COMMENT_NODE) {
        self.processingInstructions.push(self.parseProcessingInstruction(node.textContent));
        node.parentNode.removeChild(node);
      }
      find(node);
    });
  }

  find(this);
}
          
var CustomElements = {}, CE = CustomElements;

CE.elements = [];

CE.init = function() {
  each(document.querySelectorAll('link'), CE.initLink);
}

CE.initLink = function(link) {
  var init = function(loadedLink) {
    CE.elements.push(new CustomElementElement(loadedLink.content.querySelector('element')));
  }

  // poll link for loading
  var id = setInterval(function() {
    if(link.content) {
      clearInterval(id);
      init(link);
    }
  }, 100);
}

CustomElements.init();
window.CE = CustomElements;

})();
