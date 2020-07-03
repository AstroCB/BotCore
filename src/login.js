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
 * @property {string} FACEBOOK_EMAIL Facebook account email for login (optional if already logged in once)
 * @property {string} FACEBOOK_PASSWORD Facebook account password for login (optional if already logged in once)
 * @description The credentials object is required for logging in to any application using BotCore. The
 * idea of it is to store your (sensitive) credentials separately from the source of your project, in a
 * place that won't be accidentally committed to a repo and published for the world to see. It consists
 * of several required keys that allow BotCore to log in to both Facebook and the MemCachier service
 * (used to cache logins) on your behalf. The keys are listed and explained below.
 * 
 * > **NOTE**: to obtain the values for the `MEMCACHIER_` variables, you must [sign up for a free
 * MemCachier account](https://www.memcachier.com/users/signup) and create a cache. From there, you
 * will be able to retrieve the requisite info from your dashboard.
 * 
 * I recommend the following two methods for storing your credentials object due to their ease of use:
 * 
 * 1. *Environment variables*: you can store these keys as environment variables, which will prevent
 * them from being stored in any file in your project. When logging in, simply pass `process.env` as your
 * credentials object, because it will contain all of the required keys needed to log in successfully!
 * You can find an example of how to configure your credentials this way in `examples/credentials.sh`
 * in the BotCore repo.
 * 
 * 2. *A gitignored credentials file*: you can create a file (`credentials.js` or similar) that contains
 * all of your required credentials keys as exported variables, and then simply import this as a JS
 * module wherever you need to log in. Don't forget to add this credentials file to your `.gitignore`
 * so that your credentials aren't exposed! You can find an example of how to configure your credentials
 * this way in `examples/credentials.js` in the BotCore repo.
 * 
 * These are two of many possible ways you could choose to store this information. Keep in mind that
 * regardless of which method you choose, you will have to eventually pass a JavaScript object containing
 * the following keys to the {@link login} function, so you will need to be able to access this
 * information at runtime.
 * 
 * Also keep in mind that the `FACEBOOK_EMAIL` and `FACEBOOK_PASSWORD` keys are only required for login
 * if you do not have an active Facebook login session stored in BotCore (i.e. you have logged in
 * recently, and Facebook hasn't decided to terminate your session yet). BotCore caches your recent
 * logins to prevent too many hard (username/password) logins, unless you use the `forceLogin` option.
 * If you are using several bots with BotCore, consider storing your `FACEBOOK_EMAIL` and
 * `FACEBOOK_PASSWORD` keys with only one of them, and only using your `MEMCACHIER_` variables to log in
 * from other bots.
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
            email: credentials.FACEBOOK_EMAIL,
            password: credentials.FACEBOOK_PASSWORD
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
