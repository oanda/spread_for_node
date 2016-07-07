var spread = require('../lib/spread');

var toolkit = spread.SpreadToolkit( {
     port: 9333,
//     host: "oanda-app-dev",
     host: "localhost",
     user: "moz",
     groups: ["a", "b"]
    });

toolkit.on('close', function(had_error) {
    console.log("closed!");

   var fn = function(success) {
        if(!success) {
            setTimeout(function() {
                console.log('starting');
                toolkit.start(fn)
            }.bind(this), 30000);   // 30 seconds
        } else {
            console.log('SpreadToolkit re-connected. Resetting Maintenance Mode');
            delete fn;
        }
    }.bind(this);
    fn();
}.bind(this));

toolkit.start(function(flag) {
    console.log("flag: " + flag);
});
