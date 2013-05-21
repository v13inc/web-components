A proof-of-concent Web Components Framework (APOFWCF?)
======================================================

This is an early proof-of-concept web components framework, heavily inspired by [Polymer](http://www.polymer-project.org/). In fact, it uses all of their polyfills, so they probably deserve most of the credit (thanks for answering my original questions [ebidel](https://github.com/ebidel) and [sjmiles](https://github.com/sjmiles))!

For background on web components and the various technologies used to create them, please read through the Polymer project website, and [Html5Rocks](http://www.html5rocks.com/en/tutorials/) if you get lost.

Web components are an extremely important standard that will change the way we develop web applications. It adds cust elements with proper encapsulation that allows interopability between components. This excellent talk from Google I/O goes over a lot of the neat features, and shows off an awesome VisualBasic-like component builder that shows off the power of this concept: [Google I/O 2013 - Web Components in Action](https://www.youtube.com/watch?v=0g0oOOT86NY)

I ended up writing this framework to explore different possible syntaxes that could be used to create custom elements and data mappings that automatically propogate data changes. Polymer encapsulates this in a concept it calls Model Driver Views, or MDV. It is an extremely powerful concept that will help eliminate lots of boilerplate javascript. Polymer's approach is to define a new {{ }} syntax that behaves a lot like existing template language, but with data-binding built in. While I like the core of this concept, I wanted to explore alternatives that did not introduce a new syntax. Also, I fealt that Polymer wasn't declaritive enough for me, since it requires script tags and Javascript in order to initialize all custom elements.

<pre lang="HTML"><code>
  <element name="test-tag" type="web-element">
    <template>
      <h1>Hello light world!</h1>
    </template>
    <template shadow data="#my-data" data-map="#my-data-map">
      <h1>Hello shadow world! <span id="extra-data"></span></h1>
      <h3>Name: <em id="name"></em></h3>
      <label>Name (press enter to update):</label>
      <input id="name-input" value="Sean Clark <sean@v13inc.com>"/>
      <ul>
        <li id="tags"></li>
      </ul>
    </template>
    <data id="my-data">
    {
      foo: 'This is some extra data',
      tags: ['one', 'two']
    }
    </data>
    <data-map data="#my-data">
    {
      '#extra-data': foo,
      '#tags': tags,
      '#name': this.querySelector('#name-input')
    }
    </data>
  </element>
</code></pre>

<pre><code><element name="my-element" type="web-component"></element></code></pre>
----------------------------------------------------------

I wanted to eliminate the need for the <script> tag to initialize custom elements. Instead, this framework will initialize all elements that have the type="web-component" attribute, or elements that are loaded in <link> tags with the type="web-component" attribute.

When an <element> is initialized, a custom tag is created using the name attribute for the tag name. When the custom tag is rendered, the first <template> element is used as the light DOM, and the first <template shadow> element is used as the shadow DOM. Also, and <data-map> elements are initialized (see below).

<pre><code><data></data></code></pre>
-------------

Data elements are convenient ways to refer to inline data. The contents of the <data> element are a JSON-like object that is evaluated with the javascript interpreter.The <data> element is meant to be used with a <data-map> element in order to map the data onto DOM elements. In the future, the <data> element could have a 'src' or 'href' attribute that loads data from an external source. Also, it seems natural to extend it to support different types of data -- like XML.


<pre><code><data-map data="#my-data-element"></data-map></code></pre>
---------------------------------------------

Data-map elements are the companion to <data> elements. Like the <data> element, it's innerText is JSON-like data that is evaluated as Javascript. During evaluation, 'this' is a reference to the parent <element> element, and the data attribute is used to look up a <data> tag that is used as the global context.

The keys of the data-map data are used as selectors to look up a target element to map the data value to. Once the target element is found, the value is wrapped in a class with a common toString() interface, then is 'mapped' to the element's innerText. Listeners are used to detect any changes to the value, and the target element is updated appropriately. <data-map> allows for actual elements to be used as values.
