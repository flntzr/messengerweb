/**
 * de_sb_messenger.PreferencesController: messenger preferences controller.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	// imports
	const Controller = de_sb_messenger.Controller;
	const URL = window.URL || window.webkitURL;
	const AJAX = de_sb_util.AJAX;
	const APPLICATION = de_sb_messenger.APPLICATION;


	/**
	 * Creates a new preferences controller that is derived from an abstract controller.
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	const PreferencesController = de_sb_messenger.PreferencesController = function (entityCache) {
		Controller.call(this, 3, entityCache);
	}
	PreferencesController.prototype = Object.create(Controller.prototype);
	PreferencesController.prototype.constructor = PreferencesController;


	/**
	 * Displays the associated view.
	 */
	PreferencesController.prototype.display = function () {
		if (!APPLICATION.sessionUser) return;

		Controller.prototype.display.call(this);
		this.displayStatus(200, "OK");

		const sectionElement = document.querySelector("#preferences-template").content.cloneNode(true).firstElementChild;
		sectionElement.querySelector("button").addEventListener("click", this.persistUser.bind(this));
		document.querySelector("main").appendChild(sectionElement);

		const controller = this;
		const imageElement = sectionElement.querySelector("img");
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
			controller.persistAvatar();
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
	PreferencesController.prototype.displayUser = function () {
		const sectionElement = document.querySelector("section.preferences");
		const activeElements = sectionElement.querySelectorAll("input, img");
		const sessionUser = APPLICATION.sessionUser;
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
	PreferencesController.prototype.persistUser = function () {
		const sectionElement = document.querySelector("section.preferences");
		const inputElements = sectionElement.querySelectorAll("input");

		const clone = JSON.parse(JSON.stringify(APPLICATION.sessionUser));
		const password = inputElements[2].value.trim();
		clone.name.given = inputElements[3].value.trim();
		clone.name.family = inputElements[4].value.trim();
		clone.address.street = inputElements[5].value.trim();
		clone.address.postcode = inputElements[6].value.trim();
		clone.address.city = inputElements[7].value.trim();
		delete clone.observedReferences;
		delete clone.observingReferences;

		const body = JSON.stringify(clone);
		const header = {"Content-type": "application/json"};
		if (password) header["Set-password"] = password;
		AJAX.invoke("/services/people", "PUT", header, body, null, request => {
			this.displayStatus(request.status, request.statusText);
			if (request.status === 200) {
				const credentials = password ? { alias: clone.email, password: password } : null;

				AJAX.invoke("/services/people/requester", "GET", {"Accept": "application/json"}, null, credentials, request => {
					this.displayStatus(request.status, request.statusText);
					if (request.status === 200) {
						let sessionUser = JSON.parse(request.responseText);
						sessionUser.observedReferences = APPLICATION.sessionUser.observedReferences;
						sessionUser.observingReferences = APPLICATION.sessionUser.observingReferences;
						this.entityCache.put(sessionUser);
						APPLICATION.sessionUser = sessionUser;
					}
					this.displayUser();
				});
			} else if (request.status === 409) {
				APPLICATION.welcomeController.display(); 
			} else {
				this.displayUser();
			}
		});
	}


	/**
	 * Persists the session user's avatar.
	 */
	PreferencesController.prototype.persistAvatar = function () {
		const imageElement = document.querySelector("section.preferences img");
		if (!imageElement.dropFile) return;

		const resource = "/services/people/" + APPLICATION.sessionUser.identity + "/avatar";
		AJAX.invoke(resource, "PUT", {"Content-type": imageElement.dropFile.type}, imageElement.dropFile, null, request => {
			if (request.status === 200) {
				APPLICATION.sessionUser.version += 1;
			}
			imageElement.src = resource + "?time=" + new Date().getTime();
		});
		delete imageElement.dropFile;
	}
} ());