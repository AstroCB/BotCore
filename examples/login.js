/*
    Simplest way to login and begin listening for messages. Assumes that the
    required Memcachier credentials (MEMCACHIER_USERNAME, MEMCACHIER_PASSWORD,
    MEMCACHIER_SERVERS) are stored as environment variables.
*/

const botcore = require("messenger-botcore");

botcore.login.login(process.env, (err, api) => {
    if (err) {
        console.error(err);
    } else {
        // From here, you have access to the facebook-chat-api api object for
        // this login, and you can use all of the available functions from the
        // API, including sending and listening for messages. For example...
        api.listen(msgReceived);
    }
});

function msgReceived(msg) {
    // Handle message
}