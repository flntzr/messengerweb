/**
 * de_sb_messenger.WelcomeController: messenger welcome controller.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	var SUPER = de_sb_messenger.Controller;

	/**
	 * Creates a new welcome controller that is derived from an abstract controller.
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	de_sb_messenger.WelcomeController = function (entityCache) {
		SUPER.call(this, 0, entityCache);
	}
	de_sb_messenger.WelcomeController.prototype = Object.create(SUPER.prototype);
	de_sb_messenger.WelcomeController.prototype.constructor = de_sb_messenger.WelcomeController;


	/**
	 * Displays the associated view.
	 */
	de_sb_messenger.WelcomeController.prototype.display = function () {
		de_sb_messenger.APPLICATION.sessionUser	= null;
		this.entityCache.clear();
		SUPER.prototype.display.call(this);

		var sectionElement = document.querySelector("#login-template").content.cloneNode(true).firstElementChild;
		sectionElement.querySelector("button").addEventListener("click", this.login.bind(this));
		document.querySelector("main").appendChild(sectionElement);
	}


	/**
	 * Performs a login check on the given user data, assigns the controller's
	 * user object if the login was successful, and initiates rendering of the
	 * message view.
	 */
	de_sb_messenger.WelcomeController.prototype.login = function () {
		var inputElements = document.querySelectorAll("section.login input");
		var credentials = { alias: inputElements[0].value.trim(), password: inputElements[1].value.trim() };
		if (!credentials.alias | !credentials.password) {
			this.displayStatus(401, "Unauthorized");
			return;
		}

		var self = this;
		var header = {"Accept": "application/json"};
		de_sb_util.AJAX.invoke("/services/people/requester", "GET", header, null, credentials, function (request) {
			self.displayStatus(request.status, request.statusText);
			if (request.status !== 200) return;

			var sessionUser = JSON.parse(request.responseText);
			sessionUser.observingReferences = [];
			sessionUser.observedReferences = [];
			self.entityCache.put(sessionUser);
			de_sb_messenger.APPLICATION.sessionUser = sessionUser;

			var indebtedSemaphore = new de_sb_util.Semaphore(1 - 2);
			var statusAccumulator = new de_sb_util.StatusAccumulator();

			var resource = "/services/people/" + sessionUser.identity + "/peopleObserved";
			de_sb_util.AJAX.invoke(resource, "GET", header, null, null, function (request) {
				if (request.status === 200) {
					var people = JSON.parse(request.responseText);
					people.forEach(function (person) {
						self.entityCache.put(person);
						sessionUser.observedReferences.push(person.identity);
					});
				}
				statusAccumulator.offer(request.status, request.statusText);
				indebtedSemaphore.release();
			});

			resource = "/services/people/" + sessionUser.identity + "/peopleObserving";
			de_sb_util.AJAX.invoke(resource, "GET", header, null, null, function (request) {
				if (request.status === 200) {
					var people = JSON.parse(request.responseText);
					people.forEach(function (person) {
						self.entityCache.put(person);
						sessionUser.observingReferences.push(person.identity);
					});
				}
				statusAccumulator.offer(request.status, request.statusText);
				indebtedSemaphore.release();
			});

			indebtedSemaphore.acquire(function () {
				self.displayStatus(statusAccumulator.status, statusAccumulator.statusText);
				de_sb_messenger.APPLICATION.preferencesController.display();
			});
		});
	}
} ());