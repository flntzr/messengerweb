/**
 * de_sb_messenger.WelcomeController: messenger welcome controller.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	// imports
	const Semaphore = de_sb_util.Semaphore;
	const StatusAccumulator = de_sb_util.StatusAccumulator;
	const Controller = de_sb_messenger.Controller;
	const AJAX = de_sb_util.AJAX;
	const APPLICATION = de_sb_messenger.APPLICATION;


	/**
	 * Creates a new welcome controller that is derived from an abstract controller.
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	const WelcomeController = de_sb_messenger.WelcomeController = function (entityCache) {
		Controller.call(this, 0, entityCache);
	}
	WelcomeController.prototype = Object.create(Controller.prototype);
	WelcomeController.prototype.constructor = WelcomeController;


	/**
	 * Displays the associated view.
	 */
	WelcomeController.prototype.display = function () {
		de_sb_messenger.APPLICATION.sessionUser	= null;
		this.entityCache.clear();
		Controller.prototype.display.call(this);

		const sectionElement = document.querySelector("#login-template").content.cloneNode(true).firstElementChild;
		sectionElement.querySelector("button").addEventListener("click", this.login.bind(this));
		document.querySelector("main").appendChild(sectionElement);
	}


	/**
	 * Performs a login check on the given user data, assigns the controller's
	 * user object if the login was successful, and initiates rendering of the
	 * message view.
	 */
	WelcomeController.prototype.login = function () {
		const inputElements = document.querySelectorAll("section.login input");
		const credentials = { alias: inputElements[0].value.trim(), password: inputElements[1].value.trim() };
		if (!credentials.alias | !credentials.password) {
			this.displayStatus(401, "Unauthorized");
			return;
		}

		const header = {"Accept": "application/json"};
		AJAX.invoke("/services/people/requester", "GET", header, null, credentials, request => {
			this.displayStatus(request.status, request.statusText);
			if (request.status !== 200) return;

			const sessionUser = JSON.parse(request.responseText);
			sessionUser.observingReferences = [];
			sessionUser.observedReferences = [];
			this.entityCache.put(sessionUser);
			APPLICATION.sessionUser = sessionUser;

			const indebtedSemaphore = new Semaphore(1 - 2);
			const statusAccumulator = new StatusAccumulator();

			const leftResource = "/services/people/" + sessionUser.identity + "/peopleObserved";
			AJAX.invoke(leftResource, "GET", header, null, null, request => {
				if (request.status === 200) {
					const people = JSON.parse(request.responseText);
					people.forEach(person => {
						this.entityCache.put(person);
						sessionUser.observedReferences.push(person.identity);
					});
				}
				statusAccumulator.offer(request.status, request.statusText);
				indebtedSemaphore.release();
			});

			const rightResource = "/services/people/" + sessionUser.identity + "/peopleObserving";
			AJAX.invoke(rightResource, "GET", header, null, null, request => {
				if (request.status === 200) {
					const people = JSON.parse(request.responseText);
					people.forEach(person => {
						this.entityCache.put(person);
						sessionUser.observingReferences.push(person.identity);
					});
				}
				statusAccumulator.offer(request.status, request.statusText);
				indebtedSemaphore.release();
			});

			indebtedSemaphore.acquire(() => {
				this.displayStatus(statusAccumulator.status, statusAccumulator.statusText);
				APPLICATION.preferencesController.display();
			});
		});
	}
} ());