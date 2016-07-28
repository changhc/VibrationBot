// Add your requirements
var restify = require('restify'); 
var builder = require('botbuilder'); 
var sql = require('mssql');
// Setup Restify Server
var server = restify.createServer();
server.use(restify.bodyParser());
server.listen(process.env.PORT || process.env.port || 3000, function() 
{
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat bot
var connector = new builder.ChatConnector
({ appId: process.env.APP_ID, appPassword: process.env.APP_PW }); 
server.post('/api/messages', connector.listen());

server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html'
}));
/*
server.post('/testestest', function(req, res){
	if(sess.userData.ReceiveAlert)
		sess.send("DeviceId: %s\ntemp: %s\nspeed: %s\ntime: %s", req.body.deviceid, req.body.temp, req.body.speed, req.body.time);
	res.send(202);
});
*/

//DB config
var config = {
	user: process.env.DB_USER,
	password: process.env.DB_PW,
	server: process.env.DB_SERVER, // You can use 'localhost\\instance' to connect to named instance
	database: process.env.DB_NAME,
	//stream: true, // You can enable streaming globally

	options: {
		encrypt: true // Use this if you're on Windows Azure
	}
}
//var connector = new builder.ConsoleConnector().listen();		//console test 
var bot = new builder.UniversalBot(connector);
var sess;
bot.dialog('/', [
    function (session) {
        builder.Prompts.text(session, "Hello... What's your name?");
    },
    function (session, results) {
        session.userData.name = results.response;
        builder.Prompts.number(session, "Hi " + results.response + ", How many years have you been coding?"); 
    },
    function (session, results) {
        session.userData.coding = results.response;
        builder.Prompts.choice(session, "What language do you code Node using?", ["JavaScript", "CoffeeScript", "TypeScript"]);
    },
    function (session, results) {
        session.userData.language = results.response.entity;
        session.send("Got it... " + session.userData.name + 
                     " you've been programming for " + session.userData.coding + 
                     " years and use " + session.userData.language + ".");
    }
]);