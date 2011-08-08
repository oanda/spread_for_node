var spread = require('spread');

var toolkit = spread.SpreadToolkit(
    {port: 9333,
     host: "oanda-app-dev",
     user: "moz",
     groups: ["a", "b"]
    });

toolkit.start(function(flag) {
    console.log("flag: " + flag);
});
