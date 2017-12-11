/**
 * de_sb_util:
 * - EntityCache: REST based entity cache
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_util = this.de_sb_util || {};
(function () {

	/**
	 * Creates a new entity cache instance for the given requestURI. The cache
	 * will assume that the entities can be retrieved from this URI using a
	 * RESTful GET request that returns the entity encoded in content-type
	 * "application/json", and that they contain a key named "@identity".
	 * @param requestURI {String} the request URI
	 */
	de_sb_util.EntityCache = function (requestURI) {
		this.requestURI = requestURI;
		this.content = {};
	}


	/**
	 * Clears this cache.
	 * @param content {Object} the cache content (injected)
	 */
	de_sb_util.EntityCache.prototype.clear = function () {
		for (var key in this.content) {
			delete this.content[key];
		}
	}


	/**
	 * Invokes the given callback function with the entity corresponding to the given
	 * entity identity. If the entity required is not available within this cache,
	 * it is loaded using a REST service call. Note that this operation has the
	 * advantage that it can be implemented without blocking.
	 * @param entityIdentity {Object} the entity entityIdentity
	 * @param callback {Function} a function that takes an entity as an argument,
	          and is executed once said entity has become available, or null for none  
	 */
	de_sb_util.EntityCache.prototype.resolve = function (entityIdentity, callback) {
		var key = entityIdentity.toString();

		if (key in this.content) {
			if (callback) callback.call(null, this.content[key]);
		} else {
			this.refresh(entityIdentity, callback);
		}
	}


	/**
	 * Invokes the given callback function with the entity corresponding to the given
	 * entity identity. The referenced entity is loaded using a REST service call.
	 * @param entityIdentity {Object} the entity identity
	 * @param callback {Function} a function that takes an entity as an argument,
	          and is executed once said entity has become available, or null for none  
	 */
	de_sb_util.EntityCache.prototype.refresh = function (entityIdentity, callback) {
		var key = entityIdentity.toString();
		var self = this;

		var requestURI = this.requestURI + "/" + entityIdentity;
		de_sb_util.AJAX.invoke(requestURI, "GET", {"Accept": "application/json"}, null, null, function (request) {
			var entity = null;
			if (request.status === 200) {
				entity = JSON.parse(request.responseText);
				self.content[key] = entity;
			}
			if (callback) callback.call(null, entity);
		});
	}


	/**
	 * Adds the given entity to this cache.
	 * @param entity {Object} the entity
	 */
	de_sb_util.EntityCache.prototype.put = function (entity) {
		this.content[entity.identity.toString()] = entity;
	}
} ());