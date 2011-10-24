var spread = require('spread');

var toolkit = spread.SpreadToolkit(
    {port: 9333,
//     host: "oanda-app-dev",
     host: "localhost",
     user: "moz",
     groups: ["a", "b"]
    });

toolkit.on('close', function(had_error) {
    console.log("closed!");
});

toolkit.start(function(flag) {
    console.log("flag: " + flag);
});
