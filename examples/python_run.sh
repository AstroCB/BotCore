# This is an example script for running Python bots using BotCore
# Login and conversion from facebook-chat-api appstate to fbchat session are
# done in python_login.js, and the Python bot is started up if this succeeds.

if (node python_login.js) then
    # Can remove stored JS appstate if Python conversion successful
    rm appstate.json
    # Start up the fbchat bot (stored in bot.py) and pass in any provided args
    python bot.py $@
else
    echo "Login/conversion from BotCore failed"
    exit 1
fi
