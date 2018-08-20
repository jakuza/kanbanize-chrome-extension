chrome.runtime.onInstalled.addListener(details => {
	if (details.reason === 'install') {
		if (Notification.permission !== "granted") {
			Notification.requestPermission();
		}
	}
});

chrome.runtime.onUpdateAvailable.addListener(details => {
	if (Notification.permission !== "granted") {
		Notification.requestPermission();
	}
	chrome.runtime.reload();
});

/**
 * Creates contextMenu
 * @type {Object} containing 'title' - what user will see in his context menu,
 * 'contexts' - when the contextMenu will be shown - for now it's only on selection
 * 'id' - identifier for the contextMenu that was created
 */
chrome.contextMenus.create({
	title: 'Add to new Kanbanize card',
	contexts: ['selection'],
	'id': 'User_Selection'
});

chrome.contextMenus.onClicked.addListener(openPopupFromContextMenu);

/**
 * Opens our popup page (could be login-page.html or create-card.html) in a new 
 * window and centers it on the user's screen. The thing is that you cannot open
 * the extension's popup programmatically, so instead I create a new tab that is
 * not active and right away I create a new window containing either 'create-card.html'
 * page - if user is logged in or 'login-page.html' - if not 
 * @param  {Object} selectedText - user's selection can be accessed via selectedText object.
 */
function openPopupFromContextMenu(selectedText, tab) {
	chrome.tabs.executeScript(tab.id, {
		file: 'js/getDOM.js'
	}, results => {
		if (!results) {
			chrome.storage.local.set({
				txt: '',
				htm: '',
				url: ''
			});
		} else if (results) {
			// might add some chrome storage use or message passing
		}
	});

	const w = 426;
	const h = 500;
	const left = Math.round((screen.width / 2) - (w / 2));
	const top = Math.round((screen.height / 2) - (h / 2));

	chrome.storage.local.get('logged_in', data => {
		if (data.logged_in) {
			chrome.windows.create({
				url: 'create-card.html',
				type: 'popup',
				focused: true,
				height: h,
				width: w,
				top: top,
				left: left
			}, window => {
				// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
				// 	if (message.request == 'checkStatus') {
				// 		chrome.runtime.sendMessage({
				// 			selection: selectedText.selectionText,
				// 			windowId: window.id
				// 		});

				// 		return true;
				// 	}
				// });

				chrome.windows.update(window.id, {
					height: h,
					width: w,
					top: top,
					left: left
				}, window => {

				});
			});
		} else if (!data.logged_in) {
			chrome.windows.create({
				url: 'login-page.html',
				type: 'popup',
				focused: true,
				height: h,
				width: w,
				top: top,
				left: left
			}, window => {
				// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
				// 	if (message.request == 'getWindowId') {
				// 		chrome.runtime.sendMessage({
				// 			selection: selectedText.selectionText,
				// 			windowId: window.id
				// 		});

				// 		return true;
				// 	}

				// 	if (message.request == 'checkStatus') {
				// 		chrome.runtime.sendMessage({
				// 			selection: selectedText.selectionText,
				// 			windowId: window.id
				// 		});

				// 		return true;
				// 	}
				// });

				chrome.windows.update(window.id, {
					height: h,
					width: w,
					top: top,
					left: left
				}, window => {

				});
			});
		}
	});
}

/**
 * Checks if user's logged_in field is true and if so sets the popup to be 'create-card.html'
 */
chrome.storage.local.get('logged_in', data => {
	if (data.logged_in) {
		chrome.browserAction.setPopup({
			popup: 'create-card.html'
		});
	} else if (!data.logged_in) {
		chrome.browserAction.setPopup({
			popup: 'login-page.html'
		});
	}
});

/**
 * Adds Listener that waits for incoming messages from any other script in the
 * extension and it can have multiple if statements with the names of those methods
 * and actions it should take. For now we have 'getDomainApikeyAndSettings' method
 * that retrieves userApiKey, Subdomain and lastAdded Board/Column/Swimlane info
 * from the chrome.storage.local and sends it to the script that made the request.
 *
 * The 'return: true;' is !important, because it means that you wish to send a 
 * response asynchronously (this will keep the message channel open to the other 
 * end until sendResponse is called).
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.method === 'getDomainApikeyAndSettings') {
		chrome.storage.local.get(null, data => {
			let keyDomainSettings = [];
			keyDomainSettings.push(data.userAPIkey);
			keyDomainSettings.push(data.userSubdomain);
			keyDomainSettings.push(data.lastAddedBoard);
			keyDomainSettings.push(data.lastAddedColumn);
			keyDomainSettings.push(data.lastAddedSwimlane);

			sendResponse(keyDomainSettings);
		});

		return true;
	}
});


