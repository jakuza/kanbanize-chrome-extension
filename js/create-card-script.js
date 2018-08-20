document.addEventListener('DOMContentLoaded', () => {
	window.onerror = function myErrorHandler(errorMsg, urlFile, lineNumber) {
		let superSecretApikey = 'uHSTyn2FV3TcTLx7E5yaVQAkdoqZaEgY5YcK9pP9';
		let superSecretBoardId = 2;

		chrome.storage.local.get('userEmail', obj => {
			let escapedMessage = XSSHelper.escapeJson(errorMsg);

			let message = `Error Message: ${escapedMessage} 
			
				File: ${urlFile}
				Line number: ${lineNumber} 

				Card submitted by user with Email: ${obj.userEmail}`;

			const url = `https://rnd.kanbanize.com/index.php/api/kanbanize/create_new_task/format/json`;
			const postData = `{"boardid":${superSecretBoardId}, "title":"Error Chrome Extension", "description": "${message}"}`;

			post(url, postData, superSecretApikey);
		});
	};

	let createCardBtn = document.getElementById('create-card-btn');
	let logOutLink = document.getElementById('log-out-link');
	let titleInputField = document.getElementById('card-title');
	let boardSelect = document.getElementById('boards');
	let columnSelect = document.getElementById('column');
	let swimlaneSelect = document.getElementById('swimlane');
	let createCardForm = document.getElementById('create-card-form');
	let welcomeMessageSpan = document.getElementById('welcomeMessage');
	let descDiv = document.getElementById('card-description-new');
	let cardCreatedLinkOrError = document.getElementById('cardCreatedLink');
	let htmlWidth = document.documentElement.offsetWidth;
	let clearInnerHTMLTimeout;
	let clearClassNameTimeout;
	let windowId;
    let selectionText
    let selectionHTML;
	let css = document.createElement('style');
	let OSName = OSHelper.getOSName();

	// only tag a and its attributes href, title, target are allowed after XSS filtering
    let xssOptions = {
        whiteList: {
            a: ['href', 'title', 'target']
        }
    };

	window.addEventListener('boardChanged', boardSelected, false);

	descDiv.addEventListener('keydown', e => {
        if (e.keyCode === 13 && e.ctrlKey) {
            createCardBtn.click();
        }
    });

	/**
	 * htmlWidth is not 420 when extension is opened through chrome.windows.create 
	 * that is located in background.js via the contextMenu but is 420 when you 
	 * open the extension with mouse click. 
	 * 
	 * Reasoning behind this workaround: There is no inbuilt way (at least that 
	 * I know of) of distinguishing if the popup is opened via a new window or 
	 * with a user click and I need to know the difference because some custom 
	 * styles must be set in order for the textarea-resizer to work fine and for
	 * styling accross different platforms as well, because Chrome for Windows
	 * differs from Chrome for Linux or Mac.
	 * 
	 * The if statement also adds a Listener that reacts on message that is sent 
	 * by background.js script. The message contains the user selection when he
	 * clicked on the context menu and it is then used to set the value of an
	 * HTMLDomElement
	 */
	if (htmlWidth !== 420) {
		css.type = 'text/css';
		css.id = 'customStyleSheet';
		css.innerHTML = `
			body { overflow: hidden; min-height: 400px; }
			div.create-card-btn-large { position: fixed; bottom: 10px; }
			#create-card-form input[type='submit'] { margin-bottom: 10px; }
			span#requiredFields { top: -15px; }
			div#create-card-form-container { 
				position: static; 
				height: 390px;
				margin-left: 0px;
				margin-right: 10px;
				width: initial;
			}
			form#create-card-form { height: 0; }
			textarea {
				max-height: 300px;
				overflow-y: auto;
			}
			textarea#card-description { min-height: 170px; }
			#card-description-new { min-height: 170px; }
		`;

		if (OSName === 'Windows') {
			css.innerHTML += `
				div#create-card-form-container {
					margin-left: -5px;
					margin-right: 15px; 
					position: static; 
					height: 370px;
					width: initial;
				}
				#card-description-new { min-height: 155px; }
				span#requiredFields { top: -2px; }
				div.create-card-btn-large { bottom: 0px; }
			`;
		}

		document.getElementsByTagName('head')[0].appendChild(css);

		chrome.storage.local.get(null, store => {
			if (typeof store.txt === 'undefined' || typeof store.htm === 'undefined') {
				// do nothing
			} else {
				let selectionText = store.txt;
				let selectionHTML = store.htm;
				let url = store.url;

				let trimmedString = selectionText.substring(0, 50).capitalizeFirstLetter();

				if (trimmedString.indexOf(' ') >= 0 && selectionText.length > trimmedString.length) {
					trimmedString = trimmedString.substring(0, Math.min(trimmedString.length, trimmedString.lastIndexOf(' ')));
				}

				titleInputField.value = trimmedString;

				/**
                 * Used for sites where links are cut and you need to append site address manually
                 */
				let getHrefsWithoutHttp = /href\s*=\s*"((?!https?:\/\/))]*/g;
                let arrUrl = url.split('/');
                let urlToAppend = arrUrl[0] + '//' + arrUrl[2];

				selectionHTML = selectionHTML.replace(getHrefsWithoutHttp, `href="${urlToAppend}$1`);
                descDiv.innerHTML = selectionHTML;

				if (store.lastAddedBoard) {
                    createCardBtn.disabled = false;
                } else {
                    createCardBtn.disabled = true;
                }
			}
		});

	} else if (htmlWidth === 420) {
		let customStylesheet = document.getElementById('customStyleSheet');

		if (customStylesheet) {
			removeElement(customStylesheet);
		}

		titleInputField.value = '';
		descDiv.innerHTML = '';
		// descTextarea.value = '';
	}

	/**
	 * Checks for existence of HTMLDomElement and if such exists, it sends a message with
	 * method 'getDomainApikeyAndSettings' for which is listened in the 'background.js'
	 * script which sends the required information as a response (the information is
	 * retrieved by chrome.sync.storage and is sent as a response array to here).
	 * After it is received, a callback function is ran which sets the required fields
	 * as parameters to the createCardBtn.
	 * 
	 * Reason for the workaround: Everything is async and you cannot set a variable
	 * that would be visible and reusable in all of your methods but instead you
	 * have to call for the information everytime you need it and work with the
	 * callback function.
	 */
	if (createCardBtn) {
		chrome.runtime.sendMessage({
			method: 'getDomainApikeyAndSettings'
		}, response => {
			createCardBtn.apikey = response[0];
			createCardBtn.domain = response[1];
			createCardBtn.lastboard = response[2];
			createCardBtn.lastcolumn = response[3];
			createCardBtn.lastswimlane = response[4];
		});
		createCardBtn.disabled = true;
		createCardBtn.addEventListener('click', submitCardCreateForm, false);
	}

	if (logOutLink) {
		logOutLink.addEventListener('click', logMeOut, false);
	}

	if (titleInputField) {
		titleInputField.addEventListener('input', event => {
			if (event.target.value && boardSelect.value !== 'Select Board') {
				createCardBtn.disabled = false;
			} else {
				createCardBtn.disabled = true;
			}
		}, false);
	}

	/**
	 * get all values from chrome.storage for future work with them
	 * @param  {Function} callback function that will have access
	 * to all of the values
	 */
	function getAPIkeyValues(callback) {
		let personInfo = {};

		chrome.storage.local.get(null, obj => {
			personInfo.userAPIkey = obj.userAPIkey;
			personInfo.userRealname = obj.userRealname;
			personInfo.userSubdomain = obj.userSubdomain;
			personInfo.userEmail = obj.userEmail;
			personInfo.lastBoard = obj.lastAddedBoard;
			personInfo.lastColumn = obj.lastAddedColumn;
			personInfo.lastSwimlane = obj.lastAddedSwimlane;
			personInfo.firstLogIn = obj.first_logIn
			callback(personInfo);
		});
	}

	getAPIkeyValues(getAvailableBoards);

	/**
	 * Fetches all available boards for the currently logged in user by making a POST
	 * request to the Kanbanize API and show a welcome message for first login
	 * @param  {chrome.storage Object} user
	 */
	function getAvailableBoards(user) {
		if (user.firstLogIn && welcomeMessageSpan) {
			chrome.storage.local.set({
				first_logIn: false
			});

			let realName = user.userRealname;
			realName = realName.split(/[\s\.\-\_]/g);
			welcomeMessageSpan.innerHTML = `Welcome ${realName[0]}`;
			setTimeout(() => {
				welcomeMessageSpan.className = 'smoothHide';
			}, 2500);
		}

		let userBoardsNames = [];
		let userBoardsIds = [];
		const selectbox = boardSelect;

		const boardsUrl = `https://${user.userSubdomain}.kanbanize.com/index.php/api/kanbanize/get_projects_and_boards/format/json`;
		const userAPIkey = user.userAPIkey;

		if (!selectbox) {
			return;
		}

		selectbox.disabled = true;

		post(boardsUrl, '', userAPIkey).then(response => {
			let json;
			try {
				json = JSON.parse(response);
				if (!json) {
					window.setTimeout(function() {
						throw new Error(`
							Error: ${error}
							Error message: ${error.message}
							User sending request to URL: ${boardsUrl}
							User apikey: ${userAPIkey}
						`);
					}, 0);
				}

				if (json === "The request cannot be processed. Please make sure you've specified all input parameters correctly.") {
					cardCreatedLinkOrError.innerHTML = json.substring(0, json.indexOf('.'));
					cardCreatedLinkOrError.style.cursor = 'default';
					window.setTimeout(function() {
						throw new Error(`
							JSON is ${json}
							User sending request to URL: ${boardsUrl}
							User apikey: ${userAPIkey}
							
							Side note: Might be a subdomain issue
							`);
					}, 0);
				} else if (json.error === 'Invalid API Key.') {
					// we get to here if for example the user was logged while his APIKey has changed
					window.setTimeout(function() {
						throw new Error(`
							JSON is ${json}
							JSON Error: ${json.error}
							JSON Status: ${json.status}
							User sending request to URL: ${boardsUrl}
							User apikey: ${userAPIkey}
						`);
					}, 0);
					cardCreatedLinkOrError.innerHTML = json.error + ' Please log out and back in!';
					cardCreatedLinkOrError.style.cursor = 'default';
				}
			} catch (error) {
				console.log(error.message);
				window.setTimeout(function() {
					throw new Error(`
						Error: ${error}
						Error message: ${error.message}
						User sending request to URL: ${boardsUrl}
						User apikey: ${userAPIkey}
					`);
				}, 0);
			}

			/**
			 * Fills two separate arrays. First one with board names and the second one
			 * with board ids and afterwards they are used by accessing their indexes
			 * @param  {String[]} board - array of boards
			 */
			let getBoardInfo = board => {
				userBoardsNames.push(board.name);
				userBoardsIds.push(board.id);
			};

			json.projects.forEach(item => {
				item.boards.forEach(getBoardInfo);
			});

			fillBoards(selectbox, userBoardsNames, userBoardsIds);
			setSelectedIndex(selectbox, user.lastBoard);

			/**
			 * Create a new Event that will be fired when <select> selected option 
			 * is changed programmatically
			 * @type {CustomEvent}
			 */
			let boardChangedEvent = new CustomEvent('boardChanged', {
				bubbles: true,
				cancelable: true
			});

			document.dispatchEvent(boardChangedEvent);

		}, error => {
			console.error('Failed!! \n', error);
			let json;
			try {
				json = JSON.parse(error);
				if (!json) {
					window.setTimeout(function() {
						throw new Error(`
							Error: ${error}
							Error message: ${error.message}
							User sending request to URL: ${boardsUrl}
							User apikey: ${userAPIkey}
						`);
					}, 0);
				}
			} catch (error) {
				window.setTimeout(function() {
					throw new Error(`
						Error: ${error}
						Error message: ${error.message}
						User sending request to URL: ${boardsUrl}
						User apikey: ${userAPIkey}
					`);
				}, 0);
			}

			if (json.error === 'Missing one-time password.') {
				window.location.href = '401.html';
			}

			if (json.error === 'Invalid API Key.') {
				window.setTimeout(function() {
					throw new Error(`
						JSON is ${json}
						JSON Error: ${json.error}
						JSON Status: ${json.status}
						User sending request to URL: ${boardsUrl}
						User apikey: ${userAPIkey}
					`);
				}, 0);
				cardCreatedLinkOrError.innerHTML = json.error;
				cardCreatedLinkOrError.style.cursor = 'default';
			}
		});
	}

	/**
	 * Fills the first <select> element with all of the user's Boards
	 * @param  {DOM Element} <select> - select to be filled with options
	 * @param  {String[]} names - array of board names
	 * @param  {String[]} ids - array of board id's
	 */
	function fillBoards(sel, names, ids) {
		removeOptions(sel);
		initSelectbox(sel, 'Select Board');
		names.forEach((boardName, index) => {
			let opt = document.createElement('option');
			let val = ids[index];
			let name = boardName;

			opt.innerHTML = name;
			opt.value = val;
			sel.appendChild(opt);
		});

		sel.disabled = false;
		sel.addEventListener('change', boardSelected, false);
	}

	/**
	 * Fired when a board is selected from the first <select> box it calls getBoardStructure() 
	 * and passes it the right parameters while also taking care for some eye candy, 
	 * i.e. showing Loading Columns../Loading Swimlanes.. respectively 
	 */
	function boardSelected() {
		if (titleInputField.value && boardSelect.value !== 'Select Board') {
			createCardBtn.disabled = false;
		}

		let boardId;

		if (this.options) {
			boardId = this.options[this.selectedIndex].value
		} else if (!this.options) {
			boardId = createCardBtn.lastboard;
		}

		if (!boardId || !columnSelect || !swimlaneSelect) {
			return;
		}

		getBoardStructure(boardId);

		removeOptions(columnSelect);
		removeOptions(swimlaneSelect);

		initSelectbox(columnSelect, 'Loading Columns...');
		initSelectbox(swimlaneSelect, 'Loading Swimlanes...');
	}

	/**
	 * Calls get_board_structure API function and handles the JSON response so 
	 * that we have two arrays - one filled with columns and one with swimlanes
	 * which we later use to fill our <select> boxes dynamically. This is done 
	 * by calling fillSwimlanesAndColumns() function
	 * @param  {integer} boardId
	 */
	function getBoardStructure(boardId) {
		// domain, apikey, lastBoard, lastColumn, lastSwimlane values are stored in this element
		if (!createCardBtn) {
			return;
		}

		const userDomain = createCardBtn.domain;
		const userAPIkey = createCardBtn.apikey;
		const id = boardId;
		const url = `https://${userDomain}.kanbanize.com/index.php/api/kanbanize/get_board_structure/format/json`;
		const postData = `{"boardid":"${id}"}`;

		let columns = [];
		let swimlanes = [];

		post(url, postData, userAPIkey).then(response => {
			let json;
			try {
				json = JSON.parse(response);
				if (!json) {
					window.setTimeout(function() {
						throw new Error(`
							Error: ${error}
							Error message: ${error.message}
							User sending request to URL: ${url}
							User postdata: ${postData}
							User apikey: ${userAPIkey}
						`);
					}, 0);
				}
			} catch (error) {
				window.setTimeout(function() {
					throw new Error(`
						Error: ${error}
						Error message: ${error.message}
						User sending request to URL: ${url}
						User postdata: ${postData}
						User apikey: ${userAPIkey}
					`);
				}, 0);
			}

			json.columns.forEach(item => {
				columns.push(item.lcname);
			});

			json.lanes.forEach(item => {
				swimlanes.push(item.lcname);
			});

			fillSwimlanesAndColumns(columns, swimlanes);
		}, error => {
			let json;
			try {
				json = JSON.parse(error);
				if (!json) {
					window.setTimeout(function() {
						throw new Error(`
							Error: ${error}
							Error message: ${error.message}
							User sending request to URL: ${url}
							User postdata: ${postData}
							User apikey: ${userAPIkey}
						`);
					}, 0);
				}
			} catch (error) {
				window.setTimeout(function() {
					throw new Error(`
						Error: ${error}
						Error message: ${error.message}
						User sending request to URL: ${url}
						User postdata: ${postData}
						User apikey: ${userAPIkey}
					`);
				}, 0);
			}

			console.error('Failed!! \n', error);
			if (json === 'The boardid parameter was not set correctly.') {
				window.setTimeout(function() {
					throw new Error(`
						Error: ${error}
						JSON: ${json}
						JSON Error: ${json.error}
						JSON Status: ${json.status}
						User sending request to URL: ${url}
						User postdata: ${postData}
						User apikey: ${userAPIkey}
					`);
				}, 0);
				cardCreatedLinkOrError.innerHTML = json;
				cardCreatedLinkOrError.style.cursor = 'default';
			}
		});
	}

	/**
	 * Fills the second and third <select> elements with the available swimlanes 
	 * and columns for the specified board
	 * @param  {String[]} columns - array of all columns
	 * @param  {String[]} swimlanes - array of all swimlanes
	 */
	function fillSwimlanesAndColumns(columns, swimlanes) {
		if (!columnSelect || !swimlaneSelect) {
			return;
		}

		removeOptions(columnSelect);
		removeOptions(swimlaneSelect);

		columnSelect.disabled = true;
		swimlaneSelect.disabled = true;

		columns.forEach(item => {
			let opt = document.createElement('option');
			let val = item;

			if (val === 'Temp Archive') {
				val = 'Archive';
			}

			opt.innerHTML = val;
			opt.value = val;
			columnSelect.appendChild(opt);
		});

		swimlanes.forEach(item => {
			let opt = document.createElement('option');
			let val = item;

			opt.innerHTML = val;
			opt.value = val;
			swimlaneSelect.appendChild(opt);
		});

		chrome.storage.local.get(null, user => {
			if (boardSelect.options) {
				const boardvalueSent = boardSelect.options[boardSelect.selectedIndex].value;

				if (boardvalueSent === user.lastAddedBoard) {
					setSelectedIndex(columnSelect, user.lastAddedColumn);
					setSelectedIndex(swimlaneSelect, user.lastAddedSwimlane);
				} else {
					// do not set default column or swimlane because user has selected a new one
				}
			}
		});

		columnSelect.disabled = false;
		swimlaneSelect.disabled = false;

		titleInputField.focus();
	}

	function submitCardCreateForm(e) {
		e.preventDefault();

		cardCreatedLinkOrError.innerHTML = '';
		disableButton(createCardBtn, 'Creating card...');

		if (!boardSelect || !swimlaneSelect || !columnSelect || !titleInputField) {
			return;
		}

		const userAPIkey = e.target.apikey;
		const userDomain = e.target.domain;

		titleInputField.addEventListener('input', e => {
			enableButton(createCardBtn, 'Create Card');
		}, false);

		columnSelect.addEventListener('change', e => {
			enableButton(createCardBtn, 'Create Card');
		}, false);

		swimlaneSelect.addEventListener('change', e => {
			enableButton(createCardBtn, 'Create Card');
		}, false);

		let boardId = boardSelect.value;
		let lane = swimlaneSelect.value;
		let column = columnSelect.value;
		let title = titleInputField.value;
		let descriptionCE = descDiv.innerHTML;

		// XSS Protection using XSSHelper
		title = XSSHelper.stripHTMLAndQuotes(title);
		title = filterXSS(title, xssOptions);
		title = XSSHelper.escapeJson(title);
		descriptionCE = XSSHelper.htmlEntities(descriptionCE);
		descriptionCE = filterXSS(descriptionCE, xssOptions);
		descriptionCE = XSSHelper.escapeJson(descriptionCE);
		const url = `https://${userDomain}.kanbanize.com/index.php/api/kanbanize/create_new_task/format/json`;
		const postData = `{"boardid":${boardId}, "lane":"${lane}", "column":"${column}", "title":"${title}", "description": "${descriptionCE}"}`;

		post(url, postData, userAPIkey).then(response => {
			disableButton(createCardBtn, 'Create Card');
			if (clearClassNameTimeout > 0) {
				clearTimeout(clearClassNameTimeout);
				cardCreatedLinkOrError.className = '';
			}

			if (clearInnerHTMLTimeout > 0) {
				clearTimeout(clearInnerHTMLTimeout);
			}

			let json;
			try {
				json = JSON.parse(response);
				if (!json) {
					window.setTimeout(function() {
						throw new Error(`
							Error: ${error}
							Error message: ${error.message}
							User sending request to URL: ${url}
							User postdata: ${postData}
							User apikey: ${userAPIkey}
						`);
					}, 0);
				}
			} catch (error) {
				window.setTimeout(function() {
					throw new Error(`
						Error: ${error}
						Error message: ${error.message}
						User sending request to URL: ${url}
						User postdata: ${postData}
						User apikey: ${userAPIkey}
					`);
				}, 0);
			}

			let cardId = json.id;
			let successMessagePopup = `Card with <boldAndUnderlined>ID ${cardId}</boldAndUnderlined> created successfully!`;
			let successMessageWindow = `Card with ID ${cardId} created successfully!`;
			let linkToCard = `https://${userDomain}.kanbanize.com/ctrl_board/${boardId}/cards/${cardId}/details`;

			cardCreatedLinkOrError.className = '';
			cardCreatedLinkOrError.innerHTML = successMessagePopup;
			cardCreatedLinkOrError.title = 'Click here to open your newly created card.';
			cardCreatedLinkOrError.style.cursor = 'pointer';

			/**
			 * onclick is limited to one event only, so if user creates multiple cards
			 * @return {[type]} [description]
			 */
			cardCreatedLinkOrError.onclick = () => {
				window.open(linkToCard);
				return false;
			};

			if (htmlWidth !== 420) {
				/**
				 * Gets the ID of the current window (the one that executes the .js file)
				 * @param  {Callback function} window
				 */
				chrome.windows.getCurrent(window => {
					notifyUserCardCreated(successMessageWindow, linkToCard, window.id);
					minimizeTheWindow(window.id);
				});
			}

			/**
			 * First timeout is for the fade out animation - it takes 1s
			 * Second one takes care of the hidden link that is no longer needed
			 * but can be seen on :hover
			 */
			clearClassNameTimeout = setTimeout(() => {
				cardCreatedLinkOrError.className = 'smoothHide';
				clearInnerHTMLTimeout = setTimeout(() => {
					cardCreatedLinkOrError.innerHTML = '';
				}, 900);

			}, 4500);

			cardCreatedLinkOrError.className = '';

			chrome.storage.local.set({
				lastAddedBoard: boardId,
				lastAddedColumn: column,
				lastAddedSwimlane: lane
			});
		}, error => {
			let json;

			try {
				json = JSON.parse(error);
				if (!json) {
					window.setTimeout(function() {
						throw new Error(`
							Error: ${error}
							Error message: ${error.message}
							User sending request to URL: ${url}
							User postdata: ${postData}
							User apikey: ${userAPIkey}
						`);
					}, 0);
				}
			} catch (error) {
				window.setTimeout(function() {
					throw new Error(`
						Error: ${error}
						Error message: ${error.message}
						User sending request to URL: ${url}
						User postdata: ${postData}
						User apikey: ${userAPIkey}
					`);
				}, 0);
			}

			if (json !== 'The boardid parameter was not set correctly.') {
					if (json && (json.status || json.error)) {
						window.setTimeout(function() {
							throw new Error(`
								JSON: ${json}
								JSON Error: ${json.error}
								JSON Status: ${json.status}
								User sending request to URL: ${url}
								User postdata: ${postData}
								User apikey: ${userAPIkey}
							`);
						}, 0);
					} else if (json) {
						window.setTimeout(function() {
							throw new Error(`
								JSON: ${json}
								User sending request to URL: ${url}
								User postdata: ${postData}
								User apikey: ${userAPIkey}
							`);
						}, 0);
					}
				cardCreatedLinkOrError.innerHTML = json;
			}

			cardCreatedLinkOrError.innerHTML = json;
			cardCreatedLinkOrError.style.cursor = 'default';
			cardCreatedLinkOrError.onclick = () => {
				return false;
			};

			disableButton(createCardBtn, 'Create Card');
		});
	}

}, false);

/**
 * Minimizes a window using chrome.windows API
 * @param  {Integer} windowId - id of the window to be minimized
 */
function minimizeTheWindow(windowId) {
	chrome.windows.update(windowId, {
		state: 'minimized'
	});
}

/**
 * Closes window using chrome.windows API
 * @param  {Integer} windowId - id of the window to be closed
 */
function closeTheWindow(windowId) {
	chrome.windows.remove(windowId);
}


/**
 * See function definition in login.js with only difference being that here it
 * accepts one additional parameter which is a string containing the user's API key
 */
function post(url, data, userAPIkey) {
	return new Promise((resolve, reject) => {
		let req = new XMLHttpRequest();
		req.open('POST', url, true);
		req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
		req.setRequestHeader('apikey', userAPIkey);
		req.onload = () => {
			if (req.status == 200) {
				resolve(req.response);
			} else {
				reject(req.responseText);
			}
		};

		// Handle network errors
		req.onerror = function() {
			reject(Error('Network Error'));
		};

		req.send(data);
	});
}

/**
 * Initializes a selectbox with default value before first chunk of data is received 
 * from the AJAX request (we still haven't started dynamically filling it, because 
 * the information is not yet available)
 * @param  {DOM Element} selectbox
 * @param  {String} value
 */
function initSelectbox(selectbox, value) {
	selectbox.disabled = true;
	let opt = document.createElement('option');
	let val = value;
	opt.innerHTML = val;
	opt.value = val;
	opt.disabled = true;
	opt.selected = true;
	opt.style.display = 'none';
	selectbox.appendChild(opt);
}

/**
 * Clears selectbox <select>'s options
 * @param  {DOM Element} <select> 
 */
function removeOptions(selectbox) {
	for (let i = selectbox.options.length - 1; i >= 0; i--) {
		selectbox.remove(i);
	}
}

/**
 * Sets selected option from <select> item programmatically
 * @param {DOM Element} <select> - selectbox to be manipulated
 * @param {String/Int} valsearch - searches for element with such value
 */
function setSelectedIndex(selectbox, valsearch) {
	for (i = 0; i < selectbox.options.length; i++) {
		if (selectbox.options[i].value === valsearch) {
			selectbox.options[i].selected = true;
			break;
		}
	}
	return;
}

/**
 * Logs user out and clears all of his settings/info stored in the chrome.storage 
 * and also sets the default popup to be the login page
 */
function logMeOut() {
	chrome.storage.local.clear();
	chrome.browserAction.setPopup({
		popup: 'login-page.html'
	});
}

/**
 * Clears the input that is the [4]th element andthe textarea that is the 
 * [5]th element in our form. Fired when card is successfully created.
 * @param  {DOM Element} <form>
 */
function clearForm(form) {
	form.elements[4].value = '';
	form.elements[5].value = '';
}

/**
 * Enables button/input[type='submit']
 * @param  {DOM Element} button/input
 * @param  {String} value - desired display value
 */
function enableButton(button, value) {
	button.disabled = false;
	button.value = value;
}

function disableButton(button, value) {
	button.disabled = true;
	button.value = value;
}

/**
 * Used when textarea's contents are changed programmatically and it's dimensions
 * need updating to fit the content accordingly
 *
 * Flaw: Has some hardcoded values, but they cannot be avoided due to the technical
 * design of the task. For example the '416' should be window.innerWidth but for
 * some reason in chrome window.innerWidth returns a crazy value - around 1000 
 * although in 'background.js' when I create the chrome.windows I explicitly say
 * width: w; (and in same function let w = 416;) 
 * The 255 is once again window.innerHeight = 'a crazy value'
 */
function resizeTextareaToFit() {
	this.style.height = 'auto';
	this.style.height = this.scrollHeight + 'px';
	this.scrollTop = this.scrollHeight;

	window.scrollTo(window.scrollLeft, (this.scrollTop + this.scrollHeight));
	window.resizeTo(426, (this.scrollHeight + this.scrollTop) + 355);
}

function resizeTextareaToFitMax() {
	let screenHeight = screen.height;
	this.style.overflowY = 'auto';

	this.style.height = 'auto';
	this.style.height = (screenHeight - 450) + 'px';
	this.scrollTop = this.scrollHeight;

	window.scrollTo(window.scrollLeft, (this.scrollTop + this.scrollHeight));
	window.resizeTo(426, 640);
}

/**
 * Capitalizes first letter of a string and is added to String.prototype for ease of use
 * @return {String} - the string with Capitalized first letter 
 * e.g. kanbanize.capitalizeFirstLetter() -> Kanbanize
 */
String.prototype.capitalizeFirstLetter = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
}

/**
 * Removes an HTML DOM Element
 * @param  {HTML DOM Element} node - element to be removed
 */
function removeElement(node) {
	node.parentNode.removeChild(node);
}

/**
 * Shows a notification when a card is created successfully and the user has granted
 * permissions to Notification API. The notification is clickable and it takes the
 * user to the board with the current card details opened for further tweaks.
 * If no action is taken the notification disappears automatically in 4 seconds 
 * and closes the additionally created window. This window is minimized at the 
 * very same moment the notification appears, because is no longer needed.
 * @param  {String} message - message to be displayed in the notification's body
 * @param  {String} link - address that gets opened when user clicks on the notification
 * @param  {Integer} windowId - id of the window that will be closed in 4 seconds or when user clicks on the notification
 */
function notifyUserCardCreated(message, link, windowId) {
	if (!('Notification' in window)) {
		alert('This browser does not support system notifications.');
		return;
	} else if (Notification.permission === 'granted') {
		let notification = new Notification('Kanbanize', {
			icon: '../icons/kanbanize-logo-96.png',
			body: message,
			tag: 'new-kanban-card-created'
		});

		setTimeout(() => {
			notification.close();
			closeTheWindow(windowId);
		}, 4000);

		notification.addEventListener('click', event => {
			event.preventDefault();
			window.open(link);
			closeTheWindow(windowId);
			notification.close();
		}, false);
	} else if (Notification.permission !== 'denied') {
		Notification.requestPermission(permission => {
			if (permission === 'granted') {
				let notification = new Notification('Kanbanize', {
					icon: '../icons/kanbanize-logo-96.png',
					body: message,
					tag: 'new-kanban-card-created'
				});

				setTimeout(() => {
					notification.close();
					closeTheWindow(windowId);
				}, 4000);

				notification.addEventListener('click', event => {
					event.preventDefault();
					window.open(link);
					closeTheWindow(windowId);
					notification.close();
				}, false);
			}
		});
	}
}

/**
 * -helper function that goes through all textareas with 
 * [autoresize] attribute to them and adds an event listener to them that calls
 * a function whose sole purpose is to automatically stretch the textarea to 
 * fit the contents of the text while it's being typed. 
 *
 * Flaw: window.innerHeight and window.innerWidth are crazy numbers due to
 * Google Chrome internal brain issues, so there might be some hardcoded values.
 */
function autoresize() {
	this.style.height = 'auto';
	this.style.height = this.scrollHeight + 'px';
	this.scrollTop = this.scrollHeight;

	if (document.documentElement.offsetWidth !== 420) {
		this.style.overflowY = 'auto';
		this.style.maxHeight = 300 + 'px';
	} else {
		this.style.overflowY = 'auto';
		this.style.maxHeight = 270 + 'px';
	}


	if (this.scrollHeight < 300) {
		window.scrollTo(0, (this.scrollTop + this.scrollHeight));
		window.resizeTo(426, (this.scrollHeight + this.scrollTop) + 355);
	}
}