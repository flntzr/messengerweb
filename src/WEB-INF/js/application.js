/**
 * de_sb_messenger.APPLICATION: messenger application singleton.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	var ENTITY_CACHE = new de_sb_util.EntityCache("/services/entities");

	/**
	 * The messenger application singleton maintaining the view controllers.
	 */
	de_sb_messenger.APPLICATION = new function () {
		Object.defineProperty(this, "sessionUser", {
			enumerable: true,
			configurable: false,
			writable: true,
			value: null
		});

		Object.defineProperty(this, "welcomeController", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: ("WelcomeController" in de_sb_messenger ? new de_sb_messenger.WelcomeController(ENTITY_CACHE) : new de_sb_messenger.Controller(0))
		});

		Object.defineProperty(this, "messagesController", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: ("MessagesController" in de_sb_messenger ? new de_sb_messenger.MessagesController(ENTITY_CACHE) : new de_sb_messenger.Controller(1))
		});

		Object.defineProperty(this, "peopleController", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: ("PeopleController" in de_sb_messenger ? new de_sb_messenger.PeopleController(ENTITY_CACHE) : new de_sb_messenger.Controller(2))
		});

		Object.defineProperty(this, "preferencesController", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: ("PreferencesController" in de_sb_messenger ? new de_sb_messenger.PreferencesController(ENTITY_CACHE) : new de_sb_messenger.Controller(3))
		});

		var self = this;
		window.addEventListener("load", function () {
			var menuAnchors = document.querySelectorAll("header > nav a");
			menuAnchors[0].addEventListener("click", self.welcomeController.display.bind(self.welcomeController));
			menuAnchors[1].addEventListener("click", self.messagesController.display.bind(self.messagesController));
			menuAnchors[2].addEventListener("click", self.peopleController.display.bind(self.peopleController));
			menuAnchors[3].addEventListener("click", self.preferencesController.display.bind(self.preferencesController));

			self.welcomeController.display();
			self.welcomeController.displayStatus(200, "OK");
		});
	}
} ());
