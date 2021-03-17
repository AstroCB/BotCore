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

import { spawn } from "child_process";
import { login } from "./login";
import { LoginCredentials } from "./types";

// Required monitoring config vars
let monitoringInterval: NodeJS.Timeout;
let api: Facebook.API;
let maintainer: string;
let name: string;
let credentials: LoginCredentials;
let botProcess: NodeJS.Process;
let retryFunc: (api: Facebook.API) => void;

/**
 * Begins monitoring a specified API instance.
 * 
 * @param apiInstance An instance of the facebook-chat-api to monitor
 * @param maintainerId User ID of the maintainer to notify on failures
 * @param botName Name of the bot running
 * @param credentialsObj Object containing the user credentials
 * @param botProcessRef Node.js process to monitor (optional)
 * @param retryLoginCallback A callback to send a new API
 * instance to if login failed and a re-attempted login succeeded (optional –
 * omitting this callback is equivalent to disabling the retry login feature)
 * @param [pingIntervalInMinutes=10] The number of minutes between
 * checks that the bot is still running
 */
export const monitor = (
    apiInstance: Facebook.API,
    maintainerId: string,
    botName: string,
    credentialsObj: LoginCredentials,
    botProcessRef: NodeJS.Process,
    retryLoginCallback: (api: Facebook.API) => void,
    pingIntervalInMinutes = 10,
): void => {
    if (monitoringInterval) return console.error("Already monitoring an instance");

    const pingInterval = pingIntervalInMinutes * 60 * 1000;
    monitoringInterval = setInterval(monitorLoop, pingInterval);
    api = apiInstance;
    maintainer = maintainerId;
    name = botName;
    credentials = credentialsObj;
    botProcess = botProcessRef;
    retryFunc = retryLoginCallback;
};

/**
 * Cancels the monitoring of the current bot process.
 */
export const cancelMonitoring = (): void => {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
};

/**
 * Safe function to call from other packages that will alert the maintainer if
 * monitoring is on, and no-op otherwise.
 * 
 * @param msg Message for the maintainer about the issue
 */
export const criticalError = (msg: string): void => {
    if (maintainer) {
        api.sendMessage(`Critical error detected: ${msg}`, maintainer);
    }
};


function monitorLoop() {
    // Try a basic operation to see if login is still valid
    try {
        api.getFriendsList((err) => {
            if (err) {
                sendError(err);
            }
        });
    } catch (e) {
        sendError(e);
    }
}

const sendError = (e: Facebook.IError): void => {
    const errMsg = `Error detected with ${name}: ${JSON.stringify(e)}.`;
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
        });
    } else {
        // Attempt to send message to maintainer, although it will likely fail
        api.sendMessage(errMsg, maintainer);
        restartProcess();
    }
};

const restartProcess = (): void => {
    spawn(botProcess.argv[1], botProcess.argv.slice(2), {
        detached: true,
        stdio: ["ignore"]
    }).unref();
    botProcess.exit();
};