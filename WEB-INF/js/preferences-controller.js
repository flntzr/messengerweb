/**
 * de_sb_messenger.PreferencesController: messenger preferences controller.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	var URL = window.URL || window.webkitURL;
	var SUPER = de_sb_messenger.Controller;

	/**
	 * Creates a new preferences controller that is derived from an abstract controller.
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	de_sb_messenger.PreferencesController = function (entityCache) {
		SUPER.call(this, 3, entityCache);
	}
	de_sb_messenger.PreferencesController.prototype = Object.create(SUPER.prototype);
	de_sb_messenger.PreferencesController.prototype.constructor = de_sb_messenger.PreferencesController;


	/**
	 * Displays the associated view.
	 */
	de_sb_messenger.PreferencesController.prototype.display = function () {
		var sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		if (!sessionUser) return;

		SUPER.prototype.display.call(this);
		this.displayStatus(200, "OK");

		var sectionElement = document.querySelector("#preferences-template").content.cloneNode(true).firstElementChild;
		sectionElement.querySelector("button").addEventListener("click", this.persistUser.bind(this));
		document.querySelector("main").appendChild(sectionElement);

		var self = this;
		var imageElement = sectionElement.querySelector("img");
		imageElement.dropFile = null;
		imageElement.addEventListener("dragover", function (event) {
			(event = event || window.event).preventDefault();
			event.dataTransfer.dropEffect = "copy";
		});
		imageElement.addEventListener("drop", function (event) {
			(event = event || window.event).preventDefault();
			if (event.dataTransfer.files.length === 0) return;
			this.dropFile = event.dataTransfer.files[0];
			this.src = URL.createObjectURL(this.dropFile);
			self.persistAvatar();
		});
		imageElement.addEventListener("load", function (event) {
			(event = event || window.event).preventDefault();
			URL.revokeObjectURL(this.src);
		});

		this.displayUser();
	}


	/**
	 * Displays the session user.
	 * Note artificial use of changing time parameter to bypass browser caching
	 */
	de_sb_messenger.PreferencesController.prototype.displayUser = function () {
		var sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		var sectionElement = document.querySelector("section.preferences");
		var activeElements = sectionElement.querySelectorAll("input, img");
		activeElements[0].src = "/services/people/" + sessionUser.identity + "/avatar?time=" + new Date().getTime();
		activeElements[1].value = sessionUser.group;
		activeElements[2].value = sessionUser.email;
		activeElements[3].value = "";
		activeElements[4].value = sessionUser.name.given;
		activeElements[5].value = sessionUser.name.family;
		activeElements[6].value = sessionUser.address.street;
		activeElements[7].value = sessionUser.address.postcode;
		activeElements[8].value = sessionUser.address.city;
	}


	/**
	 * Persists the session user.
	 */
	de_sb_messenger.PreferencesController.prototype.persistUser = function () {
		var sectionElement = document.querySelector("section.preferences");
		var inputElements = sectionElement.querySelectorAll("input");

		var sessionUser = JSON.parse(JSON.stringify(de_sb_messenger.APPLICATION.sessionUser));
		var password = inputElements[2].value.trim();
		sessionUser.name.given = inputElements[3].value.trim();
		sessionUser.name.family = inputElements[4].value.trim();
		sessionUser.address.street = inputElements[5].value.trim();
		sessionUser.address.postcode = inputElements[6].value.trim();
		sessionUser.address.city = inputElements[7].value.trim();
		delete sessionUser.observingReferences;
		delete sessionUser.observedReferences;

		var self = this;
		var header = {"Content-type": "application/json"};
		if (password) header["Set-password"] = password;
		var body = JSON.stringify(sessionUser);
		de_sb_util.AJAX.invoke("/services/people", "PUT", header, body, null, function (request) {
			self.displayStatus(request.status, request.statusText);
			if (request.status === 200) {
				var credentials = password ? { alias: sessionUser.email, password: password } : null;

				de_sb_util.AJAX.invoke("/services/people/requester", "GET", {"Accept": "application/json"}, null, credentials, function (request) {
					self.displayStatus(request.status, request.statusText);
					if (request.status === 200) {
						var sessionUser = JSON.parse(request.responseText);
						self.entityCache.put(sessionUser);
						de_sb_messenger.APPLICATION.sessionUser = sessionUser;
					}
					self.displayUser();
				});
			} else if (request.status === 409) {
				de_sb_messenger.APPLICATION.welcomeController.display(); 
			} else {
				self.displayUser();
			}
		});
	}


	/**
	 * Persists the session user's avatar.
	 */
	de_sb_messenger.PreferencesController.prototype.persistAvatar = function () {
		var imageElement = document.querySelector("section.preferences img");
		if (!imageElement.dropFile) return;

		var resource = "/services/people/" + de_sb_messenger.APPLICATION.sessionUser.identity + "/avatar";
		de_sb_util.AJAX.invoke(resource, "PUT", {"Content-type": imageElement.dropFile.type}, imageElement.dropFile, null, function (request) {
			if (request.status === 200) {
				de_sb_messenger.APPLICATION.sessionUser.version += 1;
			}
			imageElement.src = resource + "?time=" + new Date().getTime();
		});
		delete imageElement.dropFile;
	}
} ());