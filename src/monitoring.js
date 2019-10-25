/**
 * Monitoring API
 * 
 * Provides a basic utility for monitoring a running bot process. It is
 * configurable, with options to notify a maintainer if the bot goes down,
 * automatically retry logins for stale processes, and restart the bot process
 * entirely if all else fails.
 * 
 * @module monitoring
*/

const login = require("./login");

// Required monitoring config vars
let monitoringInterval;
let api;
let maintainer;
let name;
let credentials;
let botProcess;
let retryFunc;

/**
 * @callback retryLoginCallback
 * @param {apiObj} api A new instance of the facebook-chat-api after a successful login
 */

/**
 * Begins monitoring a specified API instance.
 * 
 * @param {apiObj} apiInstance An instance of the facebook-chat-api to monitor
 * @param {string} maintainerId User ID of the maintainer to notify on failures
 * @param {string} botName Name of the bot running
 * @param {credentialsObj} credentialsObj Object containing the user credentials
 * @param {process} botProcessRef Node.js process to monitor (optional)
 * @param {retryLoginCallback} retryLoginCallback A callback to send a new API
 * instance to if login failed and a re-attempted login succeeded (optional –
 * omitting this callback is equivalent to disabling the retry login feature)
 * @param {number} [pingIntervalInMinutes=10] The number of minutes between
 * checks that the bot is still running
 */
exports.monitor = (apiInstance, maintainerId, botName, credentialsObj, botProcessRef, retryLoginCallback, pingIntervalInMinutes = 10) => {
    if (monitoringInterval) return console.error("Already monitoring an instance");

    const pingInterval = pingIntervalInMinutes * 60 * 1000;
    monitoringInterval = setInterval(monitorLoop, pingInterval);
    api = apiInstance;
    maintainer = maintainerId;
    name = botName;
    credentials = credentialsObj;
    botProcess = botProcessRef;
    retryFunc = retryLoginCallback;
}

/**
 * Cancels the monitoring of the current bot process.
 */
exports.cancelMonitoring = () => {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
}

function monitorLoop() {
    // Try a basic operation to see if login is still valid
    try {
        api.getFriendsList((err, _) => {
            if (err) {
                sendError(err);
            }
        })
    } catch (e) {
        sendError(e);
    }
}

function sendError(err) {
    const errMsg = `Error detected with ${name}: ${e}.`;
    // Attempt to re-login
    if (retryFunc) {
        login(credentials, (err, api) => {
            if (!err) {
                retryFunc(api);
                api.sendMessage(`${errMsg} Re-login successful; passing new login to retry callback...`, maintainer);
            } else {
                // Login failed; just restart the process
                restartProcess();
            }
        })
    } else {
        // Attempt to send message to maintainer, although it will likely fail
        api.sendMessage(errMsg, maintainer);
        restartProcess();
    }
}

function restartProcess() {
    spawn(botProcess.argv[1], botProcess.argv.slice(2), {
        detached: true,
        stdio: ['ignore', out, err]
    }).unref();
    botProcess.exit();
}