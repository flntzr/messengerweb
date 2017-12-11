/**
 * de_sb_messenger.Controller: abstract controller.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {

	/**
	 * Creates an "abstract" controller.
	 * @param viewOrdinal {Number} the ordinal of the view associated with this controller
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	de_sb_messenger.Controller = function (viewOrdinal, entityCache) {
		this.viewOrdinal = viewOrdinal;
		this.entityCache = entityCache;
	}


	/**
	 * Displays the view associated with this controller by marking said
	 * view's menu item as selected, and removing the main element's
	 * children.
	 */
	de_sb_messenger.Controller.prototype.display = function () {
		var menuElements = document.querySelectorAll("nav li");

		for (var viewOrdinal = 0; viewOrdinal < menuElements.length; ++viewOrdinal) {
			if (viewOrdinal == this.viewOrdinal) {
				menuElements[viewOrdinal].classList.add("selected");
			} else {
				menuElements[viewOrdinal].classList.remove("selected");
			}
		}

		var mainElement = document.querySelector("main");
		while (mainElement.lastChild) {
			mainElement.removeChild(mainElement.lastChild);
		}
	}


	/**
	 * Displays the given HTTP status.
	 * @param code {Number} the status code
	 * @param message {String} the status message
	 */
	de_sb_messenger.Controller.prototype.displayStatus = function (code, message) {
		var outputElement = document.querySelector("body > footer output");
		outputElement.value = code + " " + (code === 0 ? "unreachable" : message);

		switch (Math.floor(0.01 * code)) {
			case 1:
			case 2:
				outputElement.className = "success";
				break;
			case 3:
				outputElement.className = "warning";
				break;
			default:
				outputElement.className = "error";
				break;
		}
	}


	/**
	 * Refreshes the content of the given image slider with the avatars of
	 * the given people. Note that the given callback function is expected
	 * to be a method of this controller, designed to receive the identity
	 * of the person clicked as a parameter.
	 * 
	 * @param sliderElement {Element} the HTML element representing the image slider
	 * @param personIdentities {Array} the person identities
	 * @param clickAction {Function} controller function to be called when an icon
	 *     is clicked
	 */
	de_sb_messenger.Controller.prototype.refreshAvatarSlider = function (sliderElement, personIdentities, clickAction) {
		while (sliderElement.lastChild) sliderElement.removeChild(sliderElement.lastChild);

		var self = this;
		personIdentities.forEach(function (personIdentity) {
			self.entityCache.resolve(personIdentity, function (person) {
				var imageElement = document.createElement("img");
				imageElement.src = "/services/people/" + person.identity + "/avatar";

				var anchorElement = document.createElement("a");
				anchorElement.appendChild(imageElement);
				anchorElement.appendChild(document.createTextNode(person.name.given));
				anchorElement.title = person.name.given + " " + person.name.family;
				anchorElement.addEventListener("click", clickAction.bind(self, person.identity));
				sliderElement.appendChild(anchorElement);
			});
		});
	}
} ());