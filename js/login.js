document.addEventListener('DOMContentLoaded', () => {
    window.onerror = function myErrorHandler(errorMsg, urlFile, lineNumber) {
        let superSecretApikey = 'uHSTyn2FV3TcTLx7E5yaVQAkdoqZaEgY5YcK9pP9';
        let superSecretBoardId = 2;
        let escapedMessage = XSSHelper.escapeJson(errorMsg);

        let message = `Error Message: ${escapedMessage} 

            File: ${urlFile}
            Line number: ${lineNumber} `;

        const url = `https://rnd.kanbanize.com/index.php/api/kanbanize/create_new_task/format/json`;
        const postData = `{"boardid":${superSecretBoardId}, "title":"Error Chrome Extension", "description": "${message}"}`;

        post(url, postData, superSecretApikey);
	};

    let OSName = OSHelper.getOSName();
    let loginBtn = document.getElementById('login-btn');
    let errContainer = document.getElementById('display-errs');
    let loginForm = document.getElementById('login-form');
    let isRequired = document.getElementById('isRequired');
    let userLoggedIn = false;
    const userSubdomainField = document.getElementById('subdomain');
    const userEmailField = document.getElementById('email');
    const userPasswordField = document.getElementById('password');
    let welcomeMessageSpan = document.getElementById('welcomeMessage');
    let cssLoginPage = document.createElement('style');

    let htmlWidth = document.documentElement.offsetWidth;
    if (htmlWidth !== 420) {
        cssLoginPage.type = 'text/css';
        cssLoginPage.id = 'customLoginStylesheet';
        cssLoginPage.innerHTML = `
            body { overflow: hidden; min-height: 460px; }

            div.create-card-btn-large { position: fixed; bottom: 0px; }

            div#login-form-container {
                height: 380px;
                margin-top: -230px;
            }

            span#display-errs {
                margin-top: 30px;
            }
        `;

        if (OSName === 'Windows') {
            cssLoginPage.innerHTML += `
                body { min-height: 470px; }
                div#login-form-container {
                    margin-left: -5px;
                    margin-right: 15px;
                    position: static;
                    height: 480px;
                    width: initial;
                }
                span#display-errs { margin-top: 5px; margin-bottom: 5px; }
                #login-form input[type="submit"] { margin-top: 10px; }
            `;
        }
        document.getElementsByTagName('head')[0].appendChild(cssLoginPage);

    }

    if (loginBtn) {
        enableBtn(loginBtn, 'Log In');
    }

    if (!loginBtn || !errContainer) {
        return;
    }

    if (!userSubdomainField.value || !userEmailField.value || !userPasswordField.value) {
        loginBtn.disabled = true;
    }

    loginBtn.addEventListener('click', submitLoginForm, false);
    loginForm.addEventListener('input', validateForm, false);

    /**
     * Validates form while typing by disabling Submit button 
     * before all required fields are filled
     */
    function validateForm() {
        let enable = true;
        let inputs = loginForm.getElementsByTagName('input');

        for (let i in inputs) {
            enable = enable && inputs[i].value !== '';
        }

        loginBtn.disabled = !enable;

        if (loginBtn.disabled) {
            isRequired.style.display = 'inline';
        } else {
            isRequired.style.display = 'none';
        }
    }

    function submitLoginForm(e) {
        e.preventDefault();
        disableBtn(loginBtn, 'Logging in...');

        let userSubdomain = userSubdomainField.value;
        // this regex strips all non-alphanumeric characters from subdomain variable
        userSubdomain = userSubdomain.replace('kanbanize.com', '');
        userSubdomain = userSubdomain.replace('http://', '');
        userSubdomain = userSubdomain.replace('https://', '');
        userSubdomain = userSubdomain.replace(/[^0-9a-z]/gi, '');
        let userEmail = userEmailField.value;
        let userPassword = userPasswordField.value;

        if (!userSubdomain || !userEmail || !userPassword) {
            errContainer.innerHTML = 'Please fill out <boldAndUnderlined>all</boldAndUnderlined> fields';
            return false;
        } else {
            errContainer.innerHTML = '';
        }

        const userEmailEncoded = encodeURIComponent(userEmail);
        const url = `https://${userSubdomain}.kanbanize.com/index.php/api/kanbanize/login/format/json`;
        const postData = `{"email":"${userEmailEncoded}", "pass":"${userPassword}"}`;

        post(url, postData).then(response => {
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
                    `);
                }, 0);
            }

            errContainer.innerHTML = 'Sucessfully logged in..redirecting!';

            // set logged_in status to true, save APIkey and other values
            // and switch the page via setting the popup to create-card.html
            chrome.storage.local.set({
                userAPIkey: json.apikey,
                userSubdomain: userSubdomain,
                userEmail: json.email,
                userRealname: json.realname,
                logged_in: true,
                first_logIn: true
            });

            chrome.browserAction.setPopup({
                popup: 'create-card.html'
            });

            window.location.href = 'create-card.html';

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
                    `);
                }, 0);
            }

            if (json.error === 'Missing one-time password.') {
                window.location.href = '401.html';
                return;
            }

            if (json.response) {
                errContainer.innerHTML = json.response;
            } else if (json.error) {
                errContainer.innerHTML = json.error;
            }

            enableBtn(loginBtn, 'Log In');

            // set logged in status to false and display login-page.html
            chrome.storage.local.set({
                logged_in: false
            });

            chrome.browserAction.setPopup({
                popup: 'login-page.html'
            });
        });
    }
}, false);

/**
 * Makes an asynchronous post request that returns a promise
 * with a resolve method for when the call was successful and
 * reject method if the request failed for some reason
 * @param  {String} url
 * @param {JSON} data - data for the POST request in JSON format
 * @return {Promise with resolve/reject callbacks}
 */
function post(url, data) {
    return new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.open('POST', url, true);
        req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

        req.onload = () => {
            if (req.status == 200) {
                resolve(req.response);
            } else {
                reject(req.responseText);
            }
        };

        // Handle network errors
        req.onerror = () => {
            reject(Error('Network Error'));
        };

        req.send(data);
    });
}

/**
 * Enables button/input[type='submit']
 * @param  {DOM Element} button/input
 * @param  {String} value - desired display value
 */
function enableBtn(button, value) {
    button.disabled = false;
    button.value = value;
}

function disableBtn(button, value) {
    button.disabled = true;
    button.value = value;
}