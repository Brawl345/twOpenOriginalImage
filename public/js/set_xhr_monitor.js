( () => {
'use strict';

window.xhr_monitor.add_monitor(
    'twOpenOriginalImage.tweet-capture',
    /^https:\/\/([^.]+\.)?x\.com\/i\/api\/graphql\//,
    ['GET', 'POST',]
);

} )();
