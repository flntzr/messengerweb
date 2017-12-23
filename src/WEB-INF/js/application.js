/**
 * de_sb_messenger.APPLICATION: messenger application singleton.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	// entity cache instance
	const ENTITY_CACHE = new de_sb_util.EntityCache("/services/entities");


	/**
	 * The messenger application singleton maintaining the view controllers.
	 */
	const APPLICATION = de_sb_messenger.APPLICATION = new function () {
		Object.defineProperty(this, "sessionUser", {
			enumerable: true,
			configurable: false,
			writable: true,
			value: null
		});

		let welcomeController = null;
		Object.defineProperty(this, "welcomeController", {
			enumerable: true,
			configurable: false,
			get: function () {
				if (!welcomeController) {
					welcomeController = "WelcomeController" in de_sb_messenger
						? new de_sb_messenger.WelcomeController(ENTITY_CACHE)
						: new de_sb_messenger.Controller(0);
				}
				return welcomeController;
			}			
		});

		let messagesController = null;
		Object.defineProperty(this, "messagesController", {
			enumerable: true,
			configurable: false,
			get: function () {
				if (!messagesController) {
					messagesController = "MessagesController" in de_sb_messenger
						? new de_sb_messenger.MessagesController(ENTITY_CACHE)
						: new de_sb_messenger.Controller(1);
				}
				return messagesController;
			}			
		});

		let peopleController = null;
		Object.defineProperty(this, "peopleController", {
			enumerable: true,
			configurable: false,
			get: function () {
				if (!peopleController) {
					peopleController = "PeopleController" in de_sb_messenger
						? new de_sb_messenger.PeopleController(ENTITY_CACHE)
						: new de_sb_messenger.Controller(2);
				}
				return peopleController;
			}			
		});

		let preferencesController = null;
		Object.defineProperty(this, "preferencesController", {
			enumerable: true,
			configurable: false,
			get: function () {
				if (!preferencesController) {
					preferencesController = "PreferencesController" in de_sb_messenger
						? new de_sb_messenger.PreferencesController(ENTITY_CACHE)
						: new de_sb_messenger.Controller(3);
				}
				return preferencesController;
			}			
		});
	}


	/**
	 * Controller callback registration during load event handling.
	 */
	window.addEventListener("load", function () {
		const menuAnchors = document.querySelectorAll("header > nav a");
		menuAnchors[0].addEventListener("click", APPLICATION.welcomeController.display.bind(APPLICATION.welcomeController));
		menuAnchors[1].addEventListener("click", APPLICATION.messagesController.display.bind(APPLICATION.messagesController));
		menuAnchors[2].addEventListener("click", APPLICATION.peopleController.display.bind(APPLICATION.peopleController));
		menuAnchors[3].addEventListener("click", APPLICATION.preferencesController.display.bind(APPLICATION.preferencesController));

		APPLICATION.welcomeController.display();
		APPLICATION.welcomeController.displayStatus(200, "OK");
	});
} ());