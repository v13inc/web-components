A proof-of-concent Web Components Framework (APOFWCF?)
======================================================

Please see this JSBin for a live demo: http://jsbin.com/imetix/1/edit

This is an early proof-of-concept web components framework, heavily inspired by [Polymer](http://www.polymer-project.org/). In fact, it uses all of their polyfills, so they probably deserve most of the credit (thanks for answering my original questions [ebidel](https://github.com/ebidel) and [sjmiles](https://github.com/sjmiles))!

For background on web components and the various technologies used to create them, please read through the Polymer project website, and [Html5Rocks](http://www.html5rocks.com/en/tutorials/) if you get lost.

Web components are an extremely important standard that will change the way we develop web applications. It adds custom elements with proper encapsulation that allows interopability between components. This excellent talk from Google I/O goes over a lot of the neat features, and shows off an awesome VisualBasic-like component builder that shows off the power of this concept: [Google I/O 2013 - Web Components in Action](https://www.youtube.com/watch?v=0g0oOOT86NY)

I ended up writing this framework to explore different possible syntaxes that could be used to create custom elements and data mappings that automatically propogate data changes. Polymer encapsulates this in a concept it calls Model Driver Views, or MDV. It is an extremely powerful concept that will help eliminate lots of boilerplate javascript. Polymer's approach is to define a new {{ }} syntax that behaves a lot like existing template language, but with data-binding built in. While I like the core of this concept, I wanted to explore alternatives that did not introduce a new syntax. Also, I felt that Polymer wasn't declaritive enough for me, since it requires script tags and Javascript in order to initialize all custom elements.

Element tag
----------------------------------------------------------

I wanted to eliminate the need for the &lt;script&gt; tag to initialize custom elements. Instead, this framework will initialize all elements that have the type="web-component" attribute, or elements that are loaded in &lt;link&gt; tags with the type="web-component" attribute.

When an &lt;element&gt; is initialized, a custom tag is created using the name attribute for the tag name. When the custom tag is rendered, the first &lt;template&gt; element is used as the light DOM, and the first &lt;template shadow&gt; element is used as the shadow DOM. Also, and &lt;data-map&gt; elements are initialized (see below).

Data tag
-------------

Data elements are convenient ways to refer to inline data. The contents of the &lt;data&gt; element are a JSON-like object that is evaluated with the javascript interpreter.The &lt;data&gt; element is meant to be used with a &lt;data-map&gt; element in order to map the data onto DOM elements. In the future, the &lt;data&gt; element could have a 'src' or 'href' attribute that loads data from an external source. Also, it seems natural to extend it to support different types of data -- like XML.


Data-map Tag
---------------------------------------------

Data-map elements are the companion to &lt;data&gt; elements. Like the &lt;data&gt; element, it's innerText is JSON-like data that is evaluated as Javascript. During evaluation, 'this' is a reference to the parent &lt;element&gt; element, and the data attribute is used to look up a &lt;data&gt; tag that is used as the global context.

The keys of the data-map data are used as selectors to look up a target element to map the data value to. Once the target element is found, the value is wrapped in a class with a common toString() interface, then is 'mapped' to the element's innerText. Listeners are used to detect any changes to the value, and the target element is updated appropriately. Along with objects, &lt;data-map&gt; allows for actual elements to be used as values.
