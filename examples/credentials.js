/*
    This is an example of a credentials file that can be used to store your
    credentials object (see docs), which can be imported as a JavaScript module
    at runtime and passed directly to the login function like this:

    ```js
    const botcore = require("messenger-botcore");
    const credentials = require("credentials.js");

    botcore.login.login(credentials, (err, api) => {
        // ...
    });
    ```

    REMEMBER TO ADD THIS FILE TO YOUR .GITIGNORE!!!
*/

exports.MEMCACHIER_USERNAME = "1234A";
exports.MEMCACHIER_PASSWORD = "ABCDEFGHIJKLMNOPQRSTUVWXYZ12345";
exports.MEMCACHIER_SERVERS = "mc1.dev.ec2.memcachier.com:00000";
exports.FACEBOOK_EMAIL = "email@example.com";
exports.FACEBOOK_PASSWORD = "example_password";