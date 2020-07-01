/*
    This script is an example of how BotCore can be used with Python projects
    using the fbchat package. To see how this would be invoked (i.e. how to
    start up a Python bot relying on BotCore), see python_run.sh.
*/

const botcore = require("messenger-botcore");
const fs = require("fs");

// fbchat stores logins in a file called "session.txt" by convention
// FBCHAT_SESSION can be changed to reflect wherever you expect session files
// to be stored in your Python code
const BOTCORE_SESSION = "appstate.json";
const FBCHAT_SESSION = "session.txt";

botcore.login.login(process.env, (err, api) => {
    if (!err) {
        fs.writeFileSync(BOTCORE_SESSION, JSON.stringify(api.getAppState()));
        botcore.login.convertToFile(BOTCORE_SESSION, FBCHAT_SESSION, err => {
            process.exit(err ? 1 : 0);
        });
    } else {
        console.log(err);
        process.exit(1);
    }
});
