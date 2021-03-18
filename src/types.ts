/**
 * Logging into BotCore
 * 
 * The `LoginCredentials` object is required for logging in to any application using BotCore. The
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
export interface LoginCredentials {
    /**
     * Facebook account email for login (optional if already logged in once)
     */
    FACEBOOK_EMAIL?: string,
    /**
     * Facebook account password for login (optional if already logged in once)
     */
    FACEBOOK_PASSWORD?: string,
    /**
     * Memcachier servers (from [dashboard](https://www.memcachier.com/caches)
     * or Heroku) for storage
     */
    MEMCACHIER_SERVERS: string,
    /**
     * Memcachier username (from [dashboard](https://www.memcachier.com/caches)
     * or Heroku) for storage
     */
    MEMCACHIER_USERNAME: string,
    /**
     * Memcachier password (from [dashboard](https://www.memcachier.com/caches)
     * or Heroku) for storage
     */
    MEMCACHIER_PASSWORD: string,
}

/**
 * A list of users who are currently banned across all BotCore instances
 */
export type BannedUserList = string[];

export type StringDict = { [key: string]: string };

/**
 * @callback UsersCallback
 * @param err indicates errors (null if user retrieval is successful)
 * @param users list of IDs of users currently banned in the system
*/
export type UsersCallback = (err: Error | null, users?: BannedUserList | null) => void;

/**
 * @callback IsBannedCallback
 * @param isBanned true if the user is banned, false otherwise
 * @param users list of IDs of users currently banned in the system
*/
export type IsBannedCallback = (isBanned: boolean, users?: string[] | null) => void;

/**
 * @callback SuccessCallback
 * @param success true if the operation succeeded (i.e. the user was
 * banned or unbanned), false otherwise (if the user was already banned/
 * unbanned to begin with)
 */
export type SuccessCallback = (success: boolean) => void;

/**
 * @callback LoginCallback
 * @param err indicates errors (null if login is successful)
 * @param api null if login fails, see
 * [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api) for details
*/
export type LoginCallback = (err: Facebook.ILoginError, api: Facebook.API) => void;

/**
 * @callback GenericErrCallback
 * @param err Message specifying the error (or null if none)
 */
export type GenericErrCallback = (err: Error | null) => void;

/**
 * @callback ErrDataCallback
 * @param err Message specifying the error (or null if none)
 * @param success Data returned from the successful operation
 */

export type ErrDataCallback = (err: Error | null, data?: unknown) => void;
