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
const ArgumentParser = require("argparse").ArgumentParser;

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
 * See examples/ for example usage.
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
 * @callback errDataCb
 * @param {string} err Message specifying the error (or null if none)
 * @param {Object} success Data returned from the successful operation
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
 * @param {errDataCb} callback
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

/**
 * Converts a (NodeJS) facebook-chat-api appstate into a (Python) fbchat
 * session. See the examples/ directory for how this can be used to create
 * an fbchat bot with BotCore.
 * 
 * @param {string} filename Name of the file whose location contains the
 * appstate data to be converted
 * @param {errDataCb} callback Callback to use after conversion completed,
 * passed the converted session
 */
exports.convert = (filename, callback) => {
    fs.readFile(filename, (err, file) => {
        if (err) {
            callback(err);
        } else {
            // Extract the required information from the appstate
            let data = JSON.parse(file);
            let attrs = ["c_user", "datr", "fr", "sb", "spin", "xs"];
            let output = attrs.reduce((obj, key) => {
                obj[key] = searchAttribute(data, key);
                return obj;
            }, {});
            output["noscript"] = "1"; // Special attr

            callback(null, output);
        }
    });
}

/**
 * A variant of `convert` that directly outputs the converted session to a file.
 * 
 * @param {string} appstate Location of appstate to be converted
 * @param {string} output Where to place the converted session
 * @param {genericErrCb} callback Callback called after conversion
 */
exports.convertToFile = (appstate, output, callback) => {
    this.convert(appstate, (err, session) => {
        if (err) {
            callback(err);
        } else {
            fs.writeFile(output, JSON.stringify(session), null, callback);
        }
    });
}

/** 
 * facebook-chat-api appstates are an array of objects containing "key" and
 * "value" keys and additional properties (that the Python API doesn't use).
 * 
 * This function searches and extracts the value for the given key, discarding
 * the other information.
 * 
 * @param {Object} data facebook-chat-api appstate
 * @param {string} key The key to locate
 * @returns {string} The value of the key (or null if not found)
*/
function searchAttribute(data, key) {
    for (let i = 0; i < data.length; i++) {
        if (data[i].key == key) {
            return data[i].value;
        }
    }
}

if (require.main === module) {
    const parser = new ArgumentParser({ addHelp: true });
    parser.addArgument('--MEMCACHIER-USERNAME', { required: true });
    parser.addArgument('--MEMCACHIER-PASSWORD', { required: true });
    parser.addArgument('--MEMCACHIER-SERVERS', { required: true });
    parser.addArgument('--logout', { nargs: 0 });
    parser.addArgument('--dump-login', { nargs: 0 });
    parser.addArgument('--load-login', { nargs: 0 });
    parser.addArgument('--convert-login', { nargs: 0 });
    const args = parser.parseArgs();

    exports.login(args, _ => {
        if (args.logout !== null) {
            exports.logout(_ => {
                process.exit();
            });
        } else if (args.dump_login !== null) {
            exports.dumpLogin("appstate.json", _ => {
                process.exit();
            });
        } else if (args.load_login !== null) {
            exports.loadLogin("appstate.json", _ => {
                process.exit();
            });
        } else if (args.convert_login !== null) {
            this.convertToFile("appstate.json", "session.txt", _ => {
                process.exit();
            });
        } else {
            process.exit();
        }
    });
}
