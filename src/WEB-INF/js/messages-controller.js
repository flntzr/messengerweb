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

	var prettyPrintTimestamp = function(date) {
		// var month = date.toDateString();
		// var hours = date.getHours();
		// var minutes = "0" + date.getMinutes();
		// var seconds = "0" + date.getSeconds();
		// return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
		return date.toLocaleString();
	}

	var queryUsers = function(userIDs) {
		let messagePromises = [];
		for (let userID of userIDs) {
			messagePromises.push(new Promise((resolve, reject) => {
				de_sb_util.AJAX.invoke("/services/people/" + userID, "GET", null, null, null, request => {
					if (request.status !== 200) return reject(request);
					return resolve(request);
				});
			}));
		}
		return Promise.all(messagePromises);
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
		return Promise.all(messagePromises);
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
		return Promise.all(avatarPromises);
	}

	var displayMessages = function(subjectIDs, parentElement) {
		let messages = [];
		queryMessages(subjectIDs).then(messageRequests => {
			this.displayStatus(messageRequests[0].status, messageRequests[0].statusText);

			for (let request of messageRequests) {
				messages = messages.concat(JSON.parse(request.response));
			}
			messages.sort((m1, m2) => {
				if (m1.creationTimestamp === m2.creationTimestamp) return 0;
				return m1.creationTimestamp > m2.creationTimestamp? -1 : 1;
			});
			return queryUsers(messages.map(m => m.authorReference));
		}).then(userRequests => {
			// render timestamps, bodies, authors
			for (let i = 0; i < messages.length; i++) {
				let user = JSON.parse(userRequests[i].response);
				let messageElement = document.querySelector("#message-output-template").content.cloneNode(true).firstElementChild;
				messageElement.firstElementChild.firstElementChild.addEventListener("click", e => {
					let subListElement = messageElement.lastElementChild;
					while (subListElement.firstChild) {
						subListElement.removeChild(subListElement.firstChild);
					}
					displayMessages.call(this, [messages[i].identity], subListElement)
				});
				let creationDate = prettyPrintTimestamp(new Date(messages[i].creationTimestamp));
				messageElement.firstElementChild.querySelector("output").value = user.name.given + " (" + creationDate + ")";
				messageElement.children[1].querySelector("output").value = messages[i].body;
				parentElement.appendChild(messageElement);
			}
			return queryAvatars(messages.map(m => m.authorReference));
		}).then(avatarRequests => {
			// render avatars
			let urlCreator = window.URL || window.webkitURL;
			let messageElements = parentElement.children;
			for (let i = 0; i < avatarRequests.length; i++) {
				messageElements[i].firstElementChild.querySelector("img").src = urlCreator.createObjectURL(avatarRequests[i].response);
			}			
		}).catch(request => {
			displayStatus(request.status, request.statusText);
		});		
	}

	/**
	 * Displays the root messages.
	 */
	de_sb_messenger.MessagesController.prototype.displayRootMessages = function () {
		let sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		let subjectIDs = sessionUser.observedReferences.slice();
		subjectIDs.push(sessionUser.identity);
		let messagesListElement = document.querySelector(".messages > ul");
		displayMessages.call(this, subjectIDs, messagesListElement);
	}


	/**
	 * Discards an existing message editor if present, and displays a new one
	 * for the given subject.
	 * @param parentElement {Element} the parent element
	 * @param subjectIdentity {String} the subject identity
	 */
	de_sb_messenger.MessagesController.prototype.displayMessageEditor = function (parentElement, subjectIdentity) {
		let sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		let oldElement = document.querySelector(".message-input");
		if (oldElement) oldElement.remove();
		
		let messageElement = document.querySelector("#message-input-template").content.cloneNode(true).firstElementChild;
		let avatar;
		queryAvatars([sessionUser.identity]).then(requests => {
			let urlCreator = window.URL || window.webkitURL;
			avatar = urlCreator.createObjectURL(requests[0].response);
			return queryUsers([subjectIdentity]);
		}).then(requests => {
			let person = JSON.parse(requests[0].response);
			let headerElements = messageElement.firstElementChild.children;
			headerElements[1].querySelector("img").src = avatar;
			let creationDate = prettyPrintTimestamp(new Date());
			headerElements[2].value = person.name.given + " (" + prettyPrintTimestamp(creationDate) + ")";
			messageElement.querySelector("button").addEventListener("click", e => {
				this.persistMessage(messageElement, subjectIdentity);
			});
			parentElement.appendChild(messageElement);
		});
	
	}


	/**
	 * Persists a new message with the current user as author, and the given
	 * subject.
	 * @param messageElement {element} the message element
	 * @param subjectIdentity the subject identity
	 */
	de_sb_messenger.MessagesController.prototype.persistMessage = function (messageElement, subjectIdentity) {
		let message = {
			body: messageElement.querySelector("textarea").value,
			subjectReference: subjectIdentity
		};
		let body = `subjectReference=${message.subjectReference}&body=${message.body}`
		new Promise((resolve, reject) => {
			de_sb_util.AJAX.invoke("/services/messages/", "PUT", {"Content-Type": "application/x-www-form-urlencoded"}, body, null, request => {
				if (request.status !== 200) return reject(request);
				return resolve(request);
			});
		}).then(request => {
			// REFRESH
			this.displayStatus(request.status, request.statusText);
			console.log("REFRESH");
		}).catch(request => {
			this.displayStatus(request.status, request.statusText);
		});
	}
} ());