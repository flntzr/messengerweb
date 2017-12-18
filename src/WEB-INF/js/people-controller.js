/**
 * de_sb_messenger.PeopleController: messenger people controller.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	var SUPER = de_sb_messenger.Controller;
	var QUERY_PARAMETER_NAMES = ["email", "givenName", "familyName", "street", "city"];

	/**
	 * Creates a new people controller that is derived from an abstract controller.
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	de_sb_messenger.PeopleController = function (entityCache) {
		SUPER.call(this, 2, entityCache);
	}
	de_sb_messenger.PeopleController.prototype = Object.create(SUPER.prototype);
	de_sb_messenger.PeopleController.prototype.constructor = de_sb_messenger.PeopleController;


	/**
	 * Displays the associated view.
	 */
	de_sb_messenger.PeopleController.prototype.display = function () {
		var sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		if (!sessionUser) return;

		SUPER.prototype.display.call(this);
		this.displayStatus(200, "OK");

		var mainElement = document.querySelector("main");
		var sectionElement = document.querySelector("#people-observing-template").content.cloneNode(true).firstElementChild;
		this.refreshAvatarSlider(sectionElement.querySelector("div.image-slider"), sessionUser.observingReferences, this.toggleObservation);
		mainElement.appendChild(sectionElement);

		sectionElement = document.querySelector("#people-observed-template").content.cloneNode(true).firstElementChild;
		this.refreshAvatarSlider(sectionElement.querySelector("div.image-slider"), sessionUser.observedReferences, this.toggleObservation);
		mainElement.appendChild(sectionElement);

		sectionElement = document.querySelector("#candidates-template").content.cloneNode(true).firstElementChild;
		sectionElement.querySelector("button").addEventListener("click", this.query.bind(this));
		mainElement.appendChild(sectionElement);
	}


	/**
	 * Performs a REST based criteria query, and refreshes the people
	 * view's bottom avatar slider with the result.
	 */
	de_sb_messenger.PeopleController.prototype.query = function () {
		let sessionUser = JSON.parse(JSON.stringify(de_sb_messenger.APPLICATION.sessionUser));
		let inputs = document.querySelectorAll("main .candidates fieldset input");
		let email = inputs[0].value.trim();
		let firstName = inputs[1].value.trim();
		let lastName = inputs[2].value.trim();
		let street = inputs[3].value.trim();
		let city = inputs[4].value.trim();
		let queryParams = [];
		let queryParamString = "";
		if (email != "") {
			queryParams.push("mail=" + email);
		}
		if (firstName != "") {
			queryParams.push("givenName=" + firstName); 
		}
		if (lastName != "") {
			queryParams.push("familyName=" + lastName);
		}
		if (street != "") {
			queryParams.push("street=" + street);
		}
		if (city != "") {
			queryParams.push("city=" + city);
		}
		if (queryParams.length > 0) {
			queryParamString = "?" + queryParams.join("&");
		}
		
		de_sb_util.AJAX.invoke("/services/people/" + queryParamString, "GET", null, null, null, request => {
			this.displayStatus(request.status, request.statusText);
			if (request.status !== 200) return;

			let people = JSON.parse(request.responseText);
			let identities = people.map(p => p.identity);
			identities = identities.filter((id) => id !== de_sb_messenger.APPLICATION.sessionUser.identity);

			let sectionElement = document.querySelector(".candidates");
			this.refreshAvatarSlider(sectionElement.querySelector("div.image-slider"), identities, this.toggleObservation);
		});
	}


	/**
	 * Updates the user's observed people with the given person. Removes the
	 * person if it is already observed by the user, or adds it if not.
	 * @param {String} personIdentity the identity of the person to add or remove
	 */
	de_sb_messenger.PeopleController.prototype.toggleObservation = function (personIdentity) {
		let sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		let observedReferences = sessionUser.observedReferences.slice();
		let observedReferenceIndex = observedReferences.indexOf(personIdentity);
		
		if (observedReferenceIndex === -1) {
			// add observed user
			observedReferences.push(personIdentity);
		} else {
			// remove observed user
			observedReferences.splice(observedReferenceIndex, 1);
		}

		let formData = new FormData();
		for (let reference of observedReferences) {
			formData.append('peopleObserved', reference);
		}

		de_sb_util.AJAX.invoke("/services/people/" + sessionUser.identity + "/peopleObserved", "PUT", {"Content-Type": "application/x-www-form-urlencoded"}, formData, null, request => {
			this.displayStatus(request.status, request.statusText);
			if (request.status !== 204) return;
			
			sessionUser.observedReferences = observedReferences.slice();
			let sectionElement = document.querySelector(".people-observed");
			this.refreshAvatarSlider(sectionElement.querySelector("div.image-slider"), observedReferences, this.toggleObservation);
		});
	}
} ());