/**
 * Ban API
 * Provides various utilities for universally banning/unbanning users across
 * any number of bot instances
 * 
 * Note: because this API relies on the data store initialized in the login
 * module, none of its functions will work unless you've logged in already
 * via a call to `login.login`.
 *
 * @module banned
*/

const login = require("./login");
const monitoring = require("./monitoring");

const colName = "banned";
let cachedUserList;

/**
 * @callback usersCallback
 * @param {string} err indicates errors (null if user retrieval is successful)
 * @param {[string]} users list of IDs of users currently banned in the system
*/

/**
 * @callback isBannedCallback
 * @param {boolean} isBanned true if the user is banned, false otherwise
 * @param {[string]} users list of IDs of users currently banned in the system
*/

/**
 * @callback successCallback
 * @param {boolean} success true if the operation succeeded (i.e. the user was
 * banned or unbanned), false otherwise (if the user was already banned/
 * unbanned to begin with)
 */

/**
 * @typedef {Object} msgObj
 * @property {string} senderID the ID of the message's sender
 * 
 * @description A message object as received from a callback to
 * facebook-chat-api's `listen` function (see
 * [here](https://github.com/Schmavery/facebook-chat-api/blob/master/DOCS.md#listen)
 * for details)
 */

/**
 * Provides a list of user IDs representing users who are currently banned.
 * 
 * @param {usersCallback} callback 
 */
exports.getUsers = callback => {
    let usedCache = false;
    if (cachedUserList !== undefined) {
        usedCache = true;
        callback(null, cachedUserList);
    }

    const mem = login.getMemCache();
    mem.get(colName, (err, data) => {
        if (err) return callback(new Error("Failed to retrieve memory instance"));

        cachedUserList = data ? JSON.parse(data) : [];

        if (!usedCache) callback(null, cachedUserList);
    });
}

/**
 * Tests whether the given user is banned
 * @param {string} userId 
 * @param {isBannedCallback} callback 
 */
exports.isUser = (userId, callback) => {
    this.getUsers((err, users) => {
        if (err) {
            // In case of a db error, return that the user is banned to be safe
            // Alert maintainer if monitoring is on so that it doesn't just
            // look like a silent failure
            monitoring.criticalError(`Failed to determine user ban status: ${err}`);
            callback(true);
        }

        callback(users.includes(userId), users);
    })
}

/**
 * Adds the user represented by the provided user ID to the list of banned
 * users
 * 
 * @param {string} userId ID of the user to ban
 * @param {successCallback} callback
 */
exports.addUser = (userId, callback) => {
    const mem = login.getMemCache();

    this.isUser(userId, (isBanned, users) => {
        if (!isBanned) {
            users.push(userId);
            mem.set(colName, JSON.stringify(users), {});
            cachedUserList = users;
        }
        callback(!isBanned);
    });
}

/**
 * Removes the user represented by the provided user ID to the list of banned
 * users
 * 
 * @param {string} userId ID of the user to ban
 * @param {successCallback} callback
 */
exports.removeUser = (userId, callback) => {
    const mem = login.getMemCache();

    this.isUser(userId, (isBanned, users) => {
        if (isBanned) {
            users = users.filter(id => id != userId);
            mem.set(colName, JSON.stringify(users), {});
            cachedUserList = users;
        }
        callback(isBanned);
    });
}

/**
 * Utility function to quickly check whether to accept a message based on
 * whether its sender is banned
 * 
 * @param {msgObj} msg 
 * @param {isBannedCallback} callback 
 */
exports.isMessage = (msg, callback) => {
    this.isUser(msg.senderID, callback);
}