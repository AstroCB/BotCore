/**
 * Login API
 * Provides various utilities for managing the login process, including
 * login/logout and import/export of appstate files.
 * 
 * Encapsulates the login by caching the appstate in memory.
 * 
 * @module login
*/

const messenger = require("facebook-chat-api"); // Chat API
const fs = require("fs");

let mem;

/**
 * @typedef {Object} credentialsObj
 * @property {string} MEMCACHIER_USERNAME Memcachier username (from dashboard) for storage
 * @property {string} MEMCACHIER_PASSWORD Memcachier password (from dashboard) for storage
 * @property {string} MEMCACHIER_SERVERS Memcachier servers (from dashboard) for storage
 * @property {string} EMAIL Facebook account email for login (optional if already logged in once)
 * @property {string} PASSWORD Facebook account password for login (optional if already logged in once)
 */

/**
 * @callback loginCallback
 * @param {string} err indicates errors (null if login is successful)
 * @param {apiObj} api null if login fails, see
 * [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api) for details
*/

/**
 * @typedef {Object} apiObj
 * @description An API instance of the facebook-chat-api (see 
 * [here](https://github.com/Schmavery/facebook-chat-api) for details)
 */

/**
 * Call this to initialize the login module and log into Facebook using
 * [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api).
 * 
 * @param {credentialsObj} credentials
 * @param {loginCallback} callback called after login completed (successfully or unsuccessfully)
 * @param {Boolean} [forceCreds=false] if true, forces a login with credentials even if
 * appstate exists (optional)
*/
exports.login = (credentials, callback, forceCreds = false) => {
    // Initialize mem variable for external storage API (Memcachier)
    mem = require("memjs").Client.create(credentials.MEMCACHIER_SERVERS, {
        "username": credentials.MEMCACHIER_USERNAME,
        "password": credentials.MEMCACHIER_PASSWORD
    });

    // Login utility funcs
    function withAppstate(appstate, callback) {
        console.log("Logging in with saved appstate...");
        messenger({
            appState: JSON.parse(appstate)
        }, (err, api) => {
            if (err) {
                withCreds(callback);
            } else {
                callback(err, api);
            }
        });
    }
    function withCreds(callback) {
        console.log("Logging in with credentials...");
        messenger({
            email: credentials.EMAIL,
            password: credentials.PASSWORD
        }, (err, api) => {
            if (err) return console.error(`Fatal error: failed login with credentials`);

            mem.set("appstate", JSON.stringify(api.getAppState()), {}, merr => {
                if (err) {
                    return console.error(merr);
                } else {
                    callback(err, api);
                }
            });
        });
    }

    if (forceCreds) {
        // Force login with credentials
        withCreds(callback);
    } else {
        // Use stored appstate if exists, otherwise fallback to creds
        mem.get("appstate", (err, val) => {
            if (!err && val) {
                withAppstate(val, callback);
            } else {
                withCreds(callback);
            }
        });
    }
}

/**
 * @callback genericErrCb
 * @param {string} err Message specifying the error (or null if none)
 */

/**
 * @callback errSuccCb
 * @param {string} err Message specifying the error (or null if none)
 * @param {Boolean} success Boolean specifying whether the operation was successful
 */

/**
 * Dumps the current login into a specified file.
 * 
 * @param {string} filename Name of the file specifying where to store the login
 * @param {genericErrCb} callback Callback to use after writing the file 
 */
exports.dumpLogin = (filename, callback) => {
    mem.get("appstate", (err, val) => {
        if (!err) {
            fs.writeFileSync(filename, val.toString());
        }
        callback(err);
    });
}

/**
 * Reads a new login into memory from a file.
 * @param {string} filename Name of the file specifying where the imported login
 * is stored
 * @param {genericErrCb} callback Callback to use after reading the login
 */
exports.loadLogin = (filename, callback) => {
    fs.readFile(filename, (err, val) => {
        if (!err) {
            mem.set("appstate", JSON.stringify(JSON.parse(val)));
        }
        callback(err);
    });
}

/**
 * Logs out of Facebook.
 * @param {errSuccCb} callback
 */
exports.logout = (callback) => {
    mem.delete("appstate", err => {
        let success = true;
        if (err) {
            console.log(`Error logging out: ${err}`);
            success = false;
        } else {
            console.log("Logged out successfully.");
        }
        callback(err, success);
    });
}

if (require.main === module) {
    if (process.argv.includes("--logout")) {
        exports.logout(_ => {
            process.exit();
        });
    } else if (process.argv.includes("--dump")) {
        exports.dumpLogin("appstate.json", _ => {
            process.exit();
        });
    } else if (process.argv.includes("--load")) {
        exports.loadLogin("appstate.json", _ => {
            process.exit();
        });
    } else {
        module.exports(_ => {
            process.exit();
        });
    }
}
