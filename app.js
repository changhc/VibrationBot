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
var sess;
server.post('/testestest', function(req, res){
	//console.log(bot.connectors);
	if(bot != null){
		
		var msg = req;
		
		//bot.beginDialog();
	
	sql.connect(config, function(err) {
		if(err) {
			session.send("DB ERROR");
			session.endDialog();
		}
		//console.log(err);
		var request = new sql.Request();
		
		request.query("SELECT * FROM AlertSubscription;", function(err, recordset){
			console.log("size = " + recordset.length);
			for(i = 0; i < recordset.length; ++i){
				//console.log(sess.message.address);
				try{
					var addr = {
						'channelId': recordset[i].ChannelId,
						'conversation': {
							'id': recordset[i].ConvId
						},
						'user': {
							'id': recordset[i].UserId
						},
						'bot': {
							'id': recordset[i].BotId
						},
						'serviceUrl': recordset[i].ServiceURL
					};
					console.log(addr && addr.user && addr.bot && addr.serviceUrl);
					/*
				sess.message.address.channelId = 
				sess.message.address.conversation.id = ;
				sess.userData.name = recordset[i].UserName;
				sess.message.address.user.id = recordset[i].RecpId;
				sess.message.address.user.name = recordset[i].RecpName;
				sess.message.address.serviceUrl = recordset[i].ServiceURL;
				sess.send(sess.message.address.id==null);
				//console.log(sess);
				sess.send("DeviceId: %s\r\ntemp: %s\r\nspeed: %s\r\ntime: %s", msg.body.deviceid, msg.body.temp, msg.body.speed, msg.body.time);
				*/
					bot.beginDialog(addr, '/alert', msg);
				}
				catch(err){
					console.log(err);
				}
			}
			
		});
		
	});
	//sess.send("DeviceId: %s\r\ntemp: %s\r\nspeed: %s\r\ntime: %s", msg.body.deviceid, msg.body.temp, msg.body.speed, msg.body.time);
	res.send(202);
	}
});


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
/*
bot.dialog('/notify', function (session) {
   session.endDialog("I'm sending you a proactive message!");
});
bot.beginDialog({
     to: { name: "User1", channelId: "emulator" , id: "2c1c7fa3"},
     from: { name: "Bot1", channelId: "emulator", id: "56800324" }
 }, '/notify');
*/
bot.dialog('/', [

	function (session) {
		sess = session;
		//console.dir(session.message);
		builder.Prompts.number(session, "Hi " + session.userData.name + ", what would you like to know about?\n\r1. The agent ID of the latest submission\n2. The latest submission time\n3. The latest temperature data\n4. The latest speed data");
	},
	function(session, results){
		if(results.response == 1){
			if(session.userData.ReceiveAlert){
				session.send("You have subscribed.");
				session.endDialog();
				//session.beginDialog('/');
			}
			else{
				session.send("ok");
				
				var query = "INSERT INTO AlertSubscription (ChannelId, ConvId, UserName, BotId, UserId, ServiceURL) VALUES ('" + session.message.address.channelId + "', '" + session.message.address.conversation.id + "', '" + session.userData.name + "', '" + session.message.address.bot.id + "', '" + session.message.address.user.id + "', '" + session.message.address.serviceUrl + "');";
				//console.log(typeof(query));
				sql.connect(config, function(err) {
					if(err) {
						session.send("DB ERROR");
						session.endDialog();
					}
					var request = new sql.Request();
					
					request.query(query, function(err, recordset){
						console.log(err);
						if(err == undefined) session.userData.ReceiveAlert = true;
						//session.send(recordset);
						
						//session.send(msg + value + '.');
						session.endDialog();
						//session.beginDialog('/');
					});
					
				});
			}
		}
	}
	/*
	function(session, results){
		if(results.response){
			if(results.response <=4 && results.response >= 1) {

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
				console.dir(config);
				var query, msg;
				switch(results.response){
					case 1:
						query = 'SELECT TOP 1 DeviceId FROM Data ORDER BY time DESC';
						msg = "The agent ID of the latest submission is ";
						break;
					case 2:
						query = 'SELECT TOP 1 time FROM Data ORDER BY time DESC';
						msg = "The latest submission time is ";
						break;
					case 3:
						query = 'SELECT TOP 1 temp FROM Data ORDER BY time DESC';
						msg = "The latest temperature data returned is ";
						break;
					case 4:
						query = 'SELECT TOP 1 speed FROM Data ORDER BY time DESC';
						msg = "The latest speed data returned is ";
						break;
					default:
				}
				
				var value;
				
				sql.connect(config, function(err) {
					if(err) {
						session.send("DB ERROR");
						session.endDialog();
					}
					console.log(err);
					var request = new sql.Request();
					
					request.query(query, function(err, recordset){
						console.log(err);
						value = recordset;
						switch(results.response){
							case 1:
								value = value[0].DeviceId;
								break;
							case 2:
								value = value[0].time;
								break;
							case 3:
								value = value[0].temp;
								break;
							default:
								value = value[0].speed;
						}
						session.send(msg + value + '.');
						session.endDialog();
						session.beginDialog('/');
					});
					
				});

			}
				
			else {
				session.send("I can't understand. Try again.");
				session.endDialog();
				session.beginDialog('/');
			}

		}
		else{
			session.endDialog();
			session.beginDialog('/');
		}
	}*/
]);

bot.dialog('/alert', function(session){
	var msg = session.options.dialogArgs.params;
	//console.log(session.options.dialogArgs.params);
	session.send("DeviceId: %s\r\ntemp: %s\r\nspeed: %s\r\ntime: %s", msg.deviceid, msg.temp, msg.speed, msg.time);
	session.endDialog();
});

// Install First Run middleware and dialog
bot.use(builder.Middleware.firstRun({ version: 1.0, dialogId: '*:/firstRun' }));
bot.dialog('/firstRun', [
	function (session) {
		builder.Prompts.text(session, "Hello... What's your name?");
		
	},
	function (session, results) {
		// We'll save the prompts result and return control to main through
		// a call to replaceDialog(). We need to use replaceDialog() because
		// we intercepted the original call to main and we want to remove the
		// /firstRun dialog from the callstack. If we called endDialog() here
		// the conversation would end since the /firstRun dialog is the only 
		// dialog on the stack.
		session.userData.name = results.response;
		session.userData.ReceiveAlert = false;
		session.replaceDialog('/'); 
	}
]);

