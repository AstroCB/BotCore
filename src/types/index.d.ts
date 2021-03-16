/**
 * An object containing the requisite credentials for logging into BotCore
 */
export interface LoginCredentials {
    FACEBOOK_EMAIL: string,
    FACEBOOK_PASSWORD: string,
    MEMCACHIER_USERNAME: string,
    MEMCACHIER_SERVERS: string,
    MEMCACHIER_PASSWORD: string,
}

/**
 * A list of users who are currently banned across all BotCore instances
 */
export type BannedUserList = string[];

export type StringDict = { [key: string]: string };

/**
 * @callback UsersCallback
 * @param {string} err indicates errors (null if user retrieval is successful)
 * @param {[string]} users list of IDs of users currently banned in the system
*/
export type UsersCallback = (err: Error?, users?: BannedUserList?) => void;

/**
 * @callback IsBannedCallback
 * @param {boolean} isBanned true if the user is banned, false otherwise
 * @param {[string]} users list of IDs of users currently banned in the system
*/
export type IsBannedCallback = (isBanned: boolean, users?: string[]?) => void;

/**
 * @callback SuccessCallback
 * @param {boolean} success true if the operation succeeded (i.e. the user was
 * banned or unbanned), false otherwise (if the user was already banned/
 * unbanned to begin with)
 */
export type SuccessCallback = (success: boolean) => void;

/**
 * @callback LoginCallback
 * @param {string} err indicates errors (null if login is successful)
 * @param {apiObj} api null if login fails, see
 * [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api) for details
*/
export type LoginCallback = (err: Facebook.ILoginError, api: Facebook.API) => void;

/**
 * @callback GenericErrCallback
 * @param {Error} err Message specifying the error (or null if none)
 */
export type GenericErrCallback = (err: Error?) => void;

/**
 * @callback ErrDataCallback
 * @param {string} err Message specifying the error (or null if none)
 * @param {Object} success Data returned from the successful operation
 */

export type ErrDataCallback = (err: Error?, data?: unknown) => void;
