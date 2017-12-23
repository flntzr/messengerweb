/**
 * de_sb_util:
 * - EntityCache: REST based entity cache
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_util = this.de_sb_util || {};
(function () {
	// imports
	const AJAX = de_sb_util.AJAX;


	/**
	 * Creates a new entity cache instance for the given requestURI. The cache
	 * will assume that the entities can be retrieved from this URI using a
	 * RESTful GET request that returns the entity encoded in content-type
	 * "application/json", and that they contain a key named "@identity".
	 * @param requestURI {String} the request URI
	 */
	const EntityCache = de_sb_util.EntityCache = function (requestURI) {
		Object.defineProperty(this, "requestURI", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: requestURI
		});

		Object.defineProperty(this, "content", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: {}
		});
	}


	/**
	 * Clears this cache.
	 */
	Object.defineProperty(EntityCache.prototype, "clear", {
		configurable: false,
		enumerable: false,
		value: function () {
			for (let key in this.content) {
				delete this.content[key];
			}
		}
	});


	/**
	 * Adds the given entity to this cache.
	 * @param entity {Object} the entity
	 */
	Object.defineProperty(EntityCache.prototype, "put", {
		configurable: false,
		enumerable: false,
		value: function (entity) {
			this.content[entity.identity.toString()] = entity;
		}
	});


	/**
	 * Invokes the given callback function with the entity corresponding to the given
	 * entity identity. If the entity required is not available within this cache,
	 * it is loaded using a REST service call. Note that this operation has the
	 * advantage that it can be implemented without blocking.
	 * @param entityIdentity {Object} the entity identity
	 * @param callback {Function} a function that takes an entity as an argument,
	          and is executed once said entity has become available, or null for none  
	 */
	Object.defineProperty(EntityCache.prototype, "resolve", {
		configurable: false,
		enumerable: false,
		value: function (entityIdentity, callback) {
			const key = entityIdentity.toString();

			if (key in this.content) {
				if (callback) callback.call(null, this.content[key]);
			} else {
				this.refresh(entityIdentity, callback);
			}
		}
	});


	/**
	 * Invokes the given callback function with the entity corresponding to the given
	 * entity identity. The referenced entity is loaded using a REST service call.
	 * @param entityIdentity {Object} the entity identity
	 * @param callback {Function} a function that takes an entity as an argument,
	          and is executed once said entity has become available, or null for none  
	 */
	Object.defineProperty(EntityCache.prototype, "refresh", {
		configurable: false,
		enumerable: false,
		value: function (entityIdentity, callback) {
			const key = entityIdentity.toString();

			const resource = this.requestURI + "/" + entityIdentity;
			AJAX.invoke(resource, "GET", {"Accept": "application/json"}, null, null, request => {
				let entity = null;
	
				if (request.status === 200) {
					entity = JSON.parse(request.responseText);
					this.content[key] = entity;
				}
				if (callback) callback.call(null, entity);
			});
		}
	});
} ());