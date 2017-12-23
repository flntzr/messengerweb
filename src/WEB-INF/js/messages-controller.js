/**
 * de_sb_messenger.MessagesController: messenger messages controller.
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
	 * Creates a new messages controller that is derived from an abstract controller.
	 * @param entityCache {de_sb_util.EntityCache} an entity cache
	 */
	const MessagesController = de_sb_messenger.MessagesController = function (entityCache) {
		Controller.call(this, 1, entityCache);
	}
	MessagesController.prototype = Object.create(Controller.prototype);
	MessagesController.prototype.constructor = MessagesController;


	/**
	 * Displays the associated view.
	 */
	MessagesController.prototype.display = function () {
		const sessionUser = APPLICATION.sessionUser;
		if (!sessionUser) return;
		Controller.prototype.display.call(this);

		const subjectIdentities = [sessionUser.identity].concat(sessionUser.observedReferences);
		const mainElement = document.querySelector("main");
		const subjectsElement = document.querySelector("#subjects-template").content.cloneNode(true).firstElementChild;
		const messagesElement = document.querySelector("#messages-template").content.cloneNode(true).firstElementChild;
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
					this.displayStatus(request.status, request.statusText);
					return resolve(JSON.parse(request.response));
				});
			}));
		}
		return Promise.all(messagePromises);
	}

	var queryMessage = function(messageID) {
		return new Promise((resolve, reject) => {
			de_sb_util.AJAX.invoke("/services/messages/" + messageID, "GET", null, null, null, request => {
				if (request.status !== 200) return reject(request);
				this.displayStatus(request.status, request.statusText);
				return resolve(JSON.parse(request.response));
			});
		});
	}

	var queryMessages = function(messageIDs) {
		let promises = [];
		for (let messageID of messageIDs) {
			promises.push(queryMessage.call(this, messageID));
		}
		return Promise.all(promises);
	}

	var queryMessagesForSubjects = function(subjectReferences) {
		let messagePromises = [];
		for (let subjectID of subjectReferences) {
			messagePromises.push(new Promise((resolve, reject) => {
				de_sb_util.AJAX.invoke("/services/messages/?subjectReference=" + subjectID, "GET", null, null, null, request => {
					if (request.status !== 200) return reject(request);
					this.displayStatus(request.status, request.statusText);
					return resolve(JSON.parse(request.response));
				});
			}));
		}
		return Promise.all(messagePromises).then(messageArrays => {
			let messages = [];
			for (let messageArray of messageArrays) {
				for (let message of messageArray) {
					messages.push(message);
				}
			}
			return messages;
		});
	}

	var queryAvatars = function(userIDs) {
		let avatarPromises = [];
		let urlCreator = window.URL || window.webkitURL;
		for (let userID of userIDs) {
			avatarPromises.push(new Promise((resolve, reject) => {
				de_sb_util.AJAX.invoke(`/services/people/${userID}/avatar`, "GET", null, null, null, request => {
					if (request.status !== 200) return reject(request);
					this.displayStatus(request.status, request.statusText);
					return resolve(urlCreator.createObjectURL(request.response));
				}, "blob");
			}));
		}
		return Promise.all(avatarPromises);
	}

	var empty = function(element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	}

	var displayMessages = function(messageIDs, parentElement) {
		let messages = [];
		queryMessages.call(this, messageIDs).then(queriedMessages => {
			messages = queriedMessages;
			messages.sort((m1, m2) => {
				if (m1.creationTimestamp === m2.creationTimestamp) return 0;
				return m1.creationTimestamp > m2.creationTimestamp ? -1 : 1;
			});
			return queryUsers.call(this, messages.map(m => m.authorReference));
		}).then(users => {
			// render timestamps, bodies, authors
			for (let i = 0; i < messages.length; i++) {
				let user = users[i];
				let messageElement = document.querySelector("#message-output-template").content.cloneNode(true).firstElementChild;
				messageElement.firstElementChild.firstElementChild.addEventListener("click", e => {
					let subListElement = messageElement.lastElementChild;
					let expand = subListElement.innerHTML === "";
					empty(subListElement);
					if (expand) {
						queryMessagesForSubjects.call(this, [messages[i].identity]).then(messagesForSubject => {
							displayMessages.call(this, messagesForSubject.map(m => m.identity), subListElement);
						});
					}
				});
				let creationDate = prettyPrintTimestamp(new Date(messages[i].creationTimestamp));
				messageElement.firstElementChild.querySelector("output").value = user.name.given + " (" + creationDate + ")";
				messageElement.children[1].querySelector("output").value = messages[i].body;
				parentElement.appendChild(messageElement);
			}
			return queryAvatars.call(this, messages.map(m => m.authorReference));
		}).then(avatars => {
			// render avatars
			let messageElements = parentElement.children;
			for (let i = 0; i < avatars.length; i++) {
				let imageElement = messageElements[i].firstElementChild.querySelector("img");
				imageElement.src = avatars[i];
				imageElement.addEventListener("click", e => {
					this.displayMessageEditor(messageElements[i].querySelector("ul"), messages[i].identity);
				});
			}			
		}).catch(request => {
			displayStatus(request.status, request.statusText);
		});		
	}

	/**
	 * Displays the root messages.
	 */
	MessagesController.prototype.displayRootMessages = function () {
		let sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		let subjectIDs = sessionUser.observedReferences.slice();
		subjectIDs.push(sessionUser.identity);
		let messagesListElement = document.querySelector(".messages > ul");
		queryMessagesForSubjects.call(this, subjectIDs).then(messages => {
			let messageIDs = [];
			for (let message of messages) {
				messageIDs.push(message.identity);
			}
			displayMessages.call(this, messageIDs, messagesListElement);
		});
	}


	/**
	 * Discards an existing message editor if present, and displays a new one
	 * for the given subject.
	 * @param parentElement {Element} the parent element
	 * @param subjectIdentity {String} the subject identity
	 */
	MessagesController.prototype.displayMessageEditor = function (parentElement, subjectIdentity) {
		let sessionUser = de_sb_messenger.APPLICATION.sessionUser;
		let oldElement = document.querySelector(".message-input");
		if (oldElement) oldElement.remove();
		
		let messageElement = document.querySelector("#message-input-template").content.cloneNode(true).firstElementChild;
		let avatar;
		queryAvatars.call(this, [sessionUser.identity]).then(avatars => {
			avatar = avatars[0];
			let headerElements = messageElement.firstElementChild.children;
			let creationDate = prettyPrintTimestamp(new Date());
			headerElements[1].querySelector("img").src = avatar;
			headerElements[2].value = de_sb_messenger.APPLICATION.sessionUser.name.given + " (" + prettyPrintTimestamp(creationDate) + ")";
			messageElement.querySelector("button").addEventListener("click", e => {
				this.persistMessage(parentElement, subjectIdentity);
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
	MessagesController.prototype.persistMessage = function (messageElement, subjectIdentity) {
		let body = `subjectReference=${subjectIdentity}&body=${messageElement.querySelector("textarea").value}`;
		new Promise((resolve, reject) => {
			de_sb_util.AJAX.invoke("/services/messages/", "PUT", {"Content-Type": "application/x-www-form-urlencoded"}, body, null, request => {
				if (request.status !== 200) return reject(request);
				return resolve(request);
			});
		}).then(request => {
			this.displayStatus(request.status, request.statusText);

			let oldInput = document.querySelector(".message-input");
			if (oldInput) oldInput.remove();
			if (messageElement.classList.contains("messages")) {
				empty(messageElement.querySelector("ul"));
				this.displayRootMessages();
			} else {
				empty(messageElement);
				queryMessagesForSubjects.call(this, [subjectIdentity]).then(messages => {
					displayMessages.call(this, messages.map(m => m.identity), messageElement);
				});
			}
		}).catch(request => {
			this.displayStatus(request.status, request.statusText);
		});
	}
} ());