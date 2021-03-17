/**
 * Ban API
 * 
 * Provides various utilities for universally banning/unbanning users across
 * any number of bot instances
 * 
 * Note: because this API relies on the data store initialized in the login
 * module, none of its functions will work unless you've logged in already
 * via a call to `login.login`.
 *
 * @module banned
*/

import { getMemCache } from "./login";
import { criticalError } from "./monitoring";
import { BannedUserList, IsBannedCallback, SuccessCallback, UsersCallback } from "./types";

const colName = "banned";
let cachedUserList: BannedUserList;

/**
 * Provides a list of user IDs representing users who are currently banned.
 * 
 * @param callback 
 */
export const getUsers = (callback: UsersCallback): void => {
    let usedCache = false;
    if (cachedUserList !== undefined) {
        usedCache = true;
        callback(null, cachedUserList);
    }

    const mem = getMemCache();
    mem.get(colName, (err: Error | null, data: Buffer | null) => {
        if (err) return callback(new Error("Failed to retrieve memory instance"));

        cachedUserList = data ? JSON.parse(data.toString()) : [];

        if (!usedCache) callback(null, cachedUserList);
    });
};

/**
 * Tests whether the given user is banned
 * @param userId 
 * @param callback 
 */
export const isUser = (userId: string, callback: IsBannedCallback): void => {
    getUsers((err, users) => {
        if (err) {
            // In case of a db error, return that the user is banned to be safe
            // Alert maintainer if monitoring is on so that it doesn't just
            // look like a silent failure
            criticalError(`Failed to determine user ban status: ${err}`);
            callback(true);
        }

        const isBanned = users ? users.includes(userId) : false;
        callback(isBanned, users);
    });
};

/**
 * Adds the user represented by the provided user ID to the list of banned
 * users
 * 
 * @param userId ID of the user to ban
 * @param callback
 */
export const addUser = (userId: string, callback: SuccessCallback): void => {
    const mem = getMemCache();

    isUser(userId, (isBanned, users) => {
        if (!isBanned && users) {
            users.push(userId);
            mem.set(colName, JSON.stringify(users), {});
            cachedUserList = users;
        }
        callback(!isBanned);
    });
};

/**
 * Removes the user represented by the provided user ID to the list of banned
 * users
 * 
 * @param userId ID of the user to ban
 * @param callback
 */
export const removeUser = (userId: string, callback: SuccessCallback): void => {
    const mem = getMemCache();

    isUser(userId, (isBanned, users) => {
        if (isBanned && users) {
            users = users.filter(id => id != userId);
            mem.set(colName, JSON.stringify(users), {});
            cachedUserList = users;
        }
        callback(isBanned);
    });
};

/**
 * Utility function to quickly check whether to accept a message based on
 * whether its sender is banned
 * 
 * @param msg 
 * @param callback 
 */
export const isMessage = (msg: Facebook.IReceivedMessage, callback: IsBannedCallback): void => {
    isUser(msg.senderID, callback);
};