/**
 * de_sb_messenger.MessagesController: messenger messages controller.
 * Copyright (c) 2013 Sascha Baumeister
 */
"use strict";

this.de_sb_messenger = this.de_sb_messenger || {};
(function () {
	var SUPER = de_sb_messenger.Controller;

	/**
	 * Creates a new messages controller that is derived from an abstract controller.
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	de_sb_messenger.MessagesController = function (entityCache) {
		SUPER.call(this, 1, entityCache);
	}
	de_sb_messenger.MessagesController.prototype = Object.create(SUPER.prototype);
	de_sb_messenger.MessagesController.prototype.constructor = de_sb_messenger.MessagesController;

	/**
	 * Displays the associated view.
	 */
	de_sb_messenger.MessagesController.prototype.display = function () {
		var sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		if (!sessionUser) return;
		SUPER.prototype.display.call(this);

		var subjectIdentities = [sessionUser.identity].concat(sessionUser.observedReferences);
		var mainElement = document.querySelector("main");
		var subjectsElement = document.querySelector("#subjects-template").content.cloneNode(true).firstElementChild;
		var messagesElement = document.querySelector("#messages-template").content.cloneNode(true).firstElementChild;
		mainElement.appendChild(subjectsElement);
		mainElement.appendChild(messagesElement);

		this.refreshAvatarSlider(subjectsElement.querySelector("div.image-slider"), subjectIdentities, this.displayMessageEditor.bind(this, messagesElement));
		this.displayRootMessages();
	}

	var prettyPrintTimestamp = function(timestamp) {
		var date = new Date(timestamp);
		// var month = date.toDateString();
		// var hours = date.getHours();
		// var minutes = "0" + date.getMinutes();
		// var seconds = "0" + date.getSeconds();
		// return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
		return date.toLocaleString();
	}

	var queryMessages = function(subjectReferences) {
		let messagePromises = [];
		for (let subjectID of subjectReferences) {
			messagePromises.push(new Promise((resolve, reject) => {
				de_sb_util.AJAX.invoke("/services/messages/?subjectReference=" + subjectID, "GET", null, null, null, request => {
					if (request.status !== 200) return reject(request);
					return resolve(request);
				});
			}));
		}
		return messagePromises;
	}

	var queryAvatars = function(userIDs) {
		let avatarPromises = [];
		for (let userID of userIDs) {
			avatarPromises.push(new Promise((resolve, reject) => {
				de_sb_util.AJAX.invoke(`/services/people/${userID}/avatar`, "GET", null, null, null, request => {
					if (request.status !== 200) return reject(request);
					return resolve(request);
				}, "blob");
			}));
		}
		return avatarPromises;
	}

	/**
	 * Displays the root messages.
	 */
	de_sb_messenger.MessagesController.prototype.displayRootMessages = function () {
		let sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		let subjectIDs = sessionUser.observedReferences.slice();
		subjectIDs.push(sessionUser.identity);

		let messagePromises = queryMessages(subjectIDs);
		let messagesListElement = document.querySelector(".messages > ul");
		Promise.all(messagePromises).then(messageRequests => {
			this.displayStatus(messageRequests[0].status, messageRequests[0].statusText);
			
			let messages = [];
			for (let request of messageRequests) {
				messages = messages.concat(JSON.parse(request.response));
			}
			messages.sort((m1, m2) => {
				if (m1.creationTimestamp === m2.creationTimestamp) return 0;
				return m1.creationTimestamp > m2.creationTimestamp? -1 : 1;
			});
			let userIDsWithAvatars = [];
			for (let message of messages) {
				let messageElement = document.querySelector("#message-output-template").content.cloneNode(true).firstElementChild;
				messageElement.firstElementChild.querySelector("output").value = prettyPrintTimestamp(message.creationTimestamp);
				messageElement.children[1].querySelector("output").value = message.body;
				messagesListElement.appendChild(messageElement);
				userIDsWithAvatars.push(message.authorReference);
			}
			return Promise.all(queryAvatars(userIDsWithAvatars));
		}).then(avatarRequests => {
			var urlCreator = window.URL || window.webkitURL;
			let requests = [];
			let messageElements = messagesListElement.children;
			for (let i = 0; i < avatarRequests.length; i++) {
				messageElements[i].firstElementChild.querySelector("img").src = urlCreator.createObjectURL(avatarRequests[i].response);
			}
		}).catch(request => {
			this.displayStatus(request.status, request.statusText);
		});		
	}


	/**
	 * Discards an existing message editor if present, and displays a new one
	 * for the given subject.
	 * @param parentElement {Element} the parent element
	 * @param subjectIdentity {String} the subject identity
	 */
	de_sb_messenger.MessagesController.prototype.displayMessageEditor = function (parentElement, subjectIdentity) {
		// TODO
	}


	/**
	 * Persists a new message with the current user as author, and the given
	 * subject.
	 * @param messageElement {element} the message element
	 * @param subjectIdentity the subject identity
	 */
	de_sb_messenger.MessagesController.prototype.persistMessage = function (messageElement, subjectIdentity) {
		// TODO
	}
} ());