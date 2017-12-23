/**
 * de_sb_util:
 * - XML singleton: XMl marshaler
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_util = this.de_sb_util || {};
(function () {

	/**
	 * Defines the XML singleton which provides "quick and dirty" generic
	 * marshaling and unmarshaling of objects into XML and vice versa, similarly
	 * to the popular built-in JSON singleton.
	 */
	de_sb_util.XML = new function () {

		/**
		* Recursively marshals the given object into an XML document. The result will contain
		* the given root element, except if the given object is null, an array, or a function.
		* Any primitive typed field (strings, numbers, booleans) is marshaled into an attribute.
		* Any array typed field is marshaled into multiple child elements, while any other
		* Object type is recursively marshaled into a single child element. Note that similarly
		* to JSON.stringify(), joint references to the same child object will be represented
		* as content equal but disjoint XML elements. Also, recursive object references are
		* not supported, and will cause infinite loops.
		* @param {String} rootElementName the root element name for the given object
		* @param {Object} object the object to be marshaled
		* @return {String} the marshaled XML document
		*/
		Object.defineProperty(this, "marshal", {
			configurable: false,
			enumerable: false,
			value: function (rootElementName, object) {
				const objectType = Object.prototype.toString.call(object); 
				if (objectType === "[object Array]" || objectType === "[object Function]") return "";

				const xmlHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>";
				if (object === null) return xmlHeader;
				return xmlHeader + recursiveMarshal(rootElementName, object);
			}
		});
		

		/**
		* Recursively unmarshals the given XML text into an object. If the XML root element
		* contains only text, the latter is returned. Otherwise, a generic object is
		* assembled that contains fields named after each element's attributes and child
		* elements. If an element contains multiple child elements sharing the same name,
		* their values are joined into an array. Note that this implies that field values
		* may be undefined (zero occurrences), object types (single occurrence), or array
		* types (multiple occurrences) depending on the XML content.
		* @param {String} xmlElement the XML element
		* @return {Object} a generic object
		*/
		Object.defineProperty(this, "unmarshal", {
			configurable: false,
			enumerable: false,
			value: function (xml) {
				const dom = new DOMParser().parseFromString(xml, "text/xml");
				const domRootElement = dom.childNodes[0];
				return recursiveUnmarshal(domRootElement);
			}
		});


		/**
		* Private function recursively marshaling the given object into an XML element with the
		* given name. Any primitive typed field (strings, numbers, booleans) is marshaled into
		* an attribute. Any array typed field is marshaled into multiple child elements, while
		* any other object type is recursively marshaled into a single child element. Note that
		* similarly to JSON.stringify(), joint references to the same child object will be
		* represented as content equal but disjoint XML elements. Also, recursive object
		* references are not supported, and will cause infinite loops.
		* @param {String} elementName the element name for the given object
		* @param {Object} object the object to be marshaled
		* @return {String} the marshaled XML element
		*/
		function recursiveMarshal (elementName, object) {
			let attributeXml = "", bodyXml = "";

			for (let key in object) {
				const value = object[key], valueType = Object.prototype.toString.call(value);

				if (valueType === "[object Array]") {
					for (let valueIndex = 0; valueIndex < value.length; ++valueIndex) {
						bodyXml += recursiveMarshal(key, value[valueIndex])
					}
				} else if (valueType === "[object String]" || valueType === "[object Number]" || valueType === "[object Boolean]") {
					attributeXml += " " + key + "=\"" + value.toString().split("\"").join("&quot;") + "\"";
				} else if (value && valueType !== "[object Function]") {
					bodyXml += recursiveMarshal(key, value);
				}
			}

			return "<" + elementName + attributeXml + (bodyXml.length == 0 ? " />" : ">" + bodyXml + "</" + elementName + ">");
		}


		/**
		* Private function recursively unmarshaling the given DOM element into an object. If
		* the node is a text node, it's text value is returned. Otherwise a generic object is
		* returned that contains fields named after the node's attributes and child elements.
		* If a node contains multiple child elements sharing the same name, they are joined
		* into an array.
		* @param {Element} domElement the DOM element
		* @return {Object} a generic object
		*/
		function recursiveUnmarshal (domElement) {
			if(domElement.nodeName == "#text") return domElement.nodeValue.trim();

			const result = {};
			if ("attributes" in domElement) {
				for(let stop = domElement.attributes.length, index = 0; index < stop; ++index) {
					const domAttribute = domElement.attributes[index];
					result[domAttribute.nodeName] = domAttribute.nodeValue;
				}
			}

			for (let stop = domElement.childNodes.length, index = 0; index < stop; ++index) {
				const domChildElement = domElement.childNodes[index];
				const name = domChildElement.nodeName, value = recursiveUnmarshal(domChildElement);

				if (name in result) {
					const existingValue = result[name];
					if (Object.prototype.toString.call(existingValue) === "[object Array]") {
						existingValue.push(value);
					} else {
						result[name] = [existingValue, value];
					}
				} else {
					result[name] = value;
				}
			}

			return result;
		}
	}
} ());