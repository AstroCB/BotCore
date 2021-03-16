/**
 * Login API
 * Provides various utilities for managing the login process, including
 * login/logout and import/export of appstate files.
 * 
 * Encapsulates the login by caching the appstate in memory.
 * 
 * @module login
*/

import messenger from "facebook-chat-api"; // Chat API
import { writeFileSync, readFile, writeFile } from "fs";
import { ArgumentParser } from "argparse";
import { Client } from "memjs";
import { ErrDataCallback, GenericErrCallback, LoginCallback, LoginCredentials, StringDict } from "./types";

// Default behavior: minimal logging and auto-approve recent logins
const defaultOptions: Facebook.IOptions = {
    "logLevel": "error",
    "forceLogin": true,
    // TODO: Get rid of this option. We currently have to use this outdated user agent to force Facebook
    // to give us an older version of the login page that doesn't include new checks that break the API.
    "userAgent": "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Mobile Safari/537.36"
};

let mem: Client;

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
 * @typedef {Object} apiObj
 * @description An API instance of the facebook-chat-api (see 
 * [here](https://github.com/Schmavery/facebook-chat-api) for details)
 */

/**
 * Call this to initialize the login module and log into Facebook using
 * [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api).
 * See examples/ for example usage.
 * 
 * @param credentials
 * @param callback called after login completed (successfully or unsuccessfully)
 * @param {boolean} [forceCreds=false] if true, forces a login with credentials even if
 * appstate exists
 * @param [options=defaultOptions] any options you wish to pass to the API on login;
 * by default, sets `logLevel` to `error` and `forceLogin` to `true` (auto-approves errors asking
 * for approval of recent logins for simplicity)
*/
export const login = (credentials: LoginCredentials, callback: LoginCallback, forceCreds = false, options = defaultOptions): void => {
    // Initialize mem variable for external storage API (Memcachier)
    mem = Client.create(credentials.MEMCACHIER_SERVERS, {
        username: credentials.MEMCACHIER_USERNAME,
        password: credentials.MEMCACHIER_PASSWORD
    });

    // Login utility funcs
    function withAppstate(appstate: string, callback: LoginCallback) {
        console.log("Logging in with saved appstate...");
        messenger({
            appState: JSON.parse(appstate)
        }, options, (err, api) => {
            if (err) {
                withCreds(callback);
            } else {
                callback(err, api);
            }
        });
    }
    function withCreds(callback: LoginCallback) {
        console.log("Logging in with credentials...");
        messenger({
            email: credentials.FACEBOOK_EMAIL,
            password: credentials.FACEBOOK_PASSWORD
        }, options, (err, api) => {
            if (err) return console.error("Fatal error: failed login with credentials");

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
                withAppstate(val.toString(), callback);
            } else {
                withCreds(callback);
            }
        });
    }
};

/**
 * Dumps the current login into a specified file.
 * 
 * @param filename Name of the file specifying where to store the login
 * @param callback Callback to use after writing the file 
 */
export const dumpLogin = (filename: string, callback: GenericErrCallback): void => {
    mem.get("appstate", (err, val) => {
        if (!err && val) {
            writeFileSync(filename, val.toString());
        }
        callback(err);
    });
};

/**
 * Reads a new login into memory from a file.
 * @param filename Name of the file specifying where the imported login
 * is stored
 * @param callback Callback to use after reading the login
 */
export const loadLogin = (filename: string, callback: GenericErrCallback): void => {
    readFile(filename, (err, val) => {
        if (!err) {
            mem.set("appstate", JSON.stringify(JSON.parse(val.toString())), {});
        }
        callback(err);
    });
};

/**
 * Logs out of Facebook.
 * @param callback
 */
export const logout = (callback: ErrDataCallback): void => {
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
};

/**
 * Converts a (NodeJS) facebook-chat-api appstate into a (Python) fbchat
 * session. See the examples/ directory for how this can be used to create
 * an fbchat bot with BotCore.
 * 
 * @param filename Name of the file whose location contains the
 * appstate data to be converted
 * @param callback Callback to use after conversion completed,
 * passed the converted session
 */
export const convert = (filename: string, callback: ErrDataCallback): void => {
    readFile(filename, (err, file) => {
        if (err) {
            callback(err);
        } else {
            // Extract the required information from the appstate
            const data = JSON.parse(file.toString());
            const attrs = ["c_user", "datr", "fr", "sb", "spin", "xs"];
            const output = attrs.reduce((obj: StringDict, key) => {
                obj[key] = searchAttribute(data, key);
                return obj;
            }, {});
            output["noscript"] = "1"; // Special attr

            callback(null, output);
        }
    });
};

/**
 * A variant of `convert` that directly outputs the converted session to a file.
 * 
 * @param appstate Location of appstate to be converted
 * @param output Where to place the converted session
 * @param callback Callback called after conversion
 */
export const convertToFile = (appstate: string, output: string, callback: GenericErrCallback): void => {
    convert(appstate, (err, session) => {
        if (err) {
            callback(err);
        } else {
            writeFile(output, JSON.stringify(session), null, callback);
        }
    });
};

/**
 * Exposes the underlying memjs memcache instance, which can be used for
 * temporary storage. Use wisely, or you may break your BotCore installation!
 * 
 * > NOTE: if you call this before logging in with {@link login},
 * it will return nothing; the memcache is not initialized until you log in.
 * 
 * @returns {Object} The underlying BotCore [memjs](https://memjs.netlify.app)
 * instance
 */
export const getMemCache = (): Client => {
    return mem;
};

/** 
 * facebook-chat-api appstates are an array of objects containing "key" and
 * "value" keys and additional properties (that the Python API doesn't use).
 * 
 * This function searches and extracts the value for the given key, discarding
 * the other information.
 * 
 * @param data facebook-chat-api appstate
 * @param key The key to locate
 * @returns {string} The value of the key (or null if not found)
*/
function searchAttribute(data: Array<StringDict>, key: string): string {
    for (let i = 0; i < data.length; i++) {
        if (data[i].key == key) {
            return data[i].value;
        }
    }
    return "";
}

if (require.main === module) {
    const parser = new ArgumentParser({ add_help: true });
    parser.add_argument("--MEMCACHIER-USERNAME", { required: true });
    parser.add_argument("--MEMCACHIER-PASSWORD", { required: true });
    parser.add_argument("--MEMCACHIER-SERVERS", { required: true });
    parser.add_argument("--logout", { nargs: 0 });
    parser.add_argument("--dump-login", { nargs: 0 });
    parser.add_argument("--load-login", { nargs: 0 });
    parser.add_argument("--convert-login", { nargs: 0 });
    const args = parser.parse_args();

    login(args, () => {
        if (args.logout !== null) {
            logout(() => {
                process.exit();
            });
        } else if (args.dump_login !== null) {
            dumpLogin("appstate.json", () => {
                process.exit();
            });
        } else if (args.load_login !== null) {
            loadLogin("appstate.json", () => {
                process.exit();
            });
        } else if (args.convert_login !== null) {
            convertToFile("appstate.json", "session.txt", () => {
                process.exit();
            });
        } else {
            process.exit();
        }
    });
}
