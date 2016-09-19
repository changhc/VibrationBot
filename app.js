/*****LICENSE HERE*****/
/******************
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************/

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

server.post('/testestest', function(req, res){
	if(bot != null){
		
		var msg = req;
	
		sql.connect(config, function(err) {
			if(err) {
				session.send("DB ERROR");
				session.endDialog();
			}
			//console.log(err);
			var request = new sql.Request();
			
			request.query("SELECT * FROM AlertSubscription;", function(err, recordset){
				for(i = 0; i < recordset.length; ++i){
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
							'serviceUrl': recordset[i].ServiceURL,
							'useAuth': true
						};
						var text = "WARNING: " + msg.body.result + " at " + msg.body.timestamp;
						var message = {
							address: addr,
							user: addr.user,
							text: text,
							agent: 'botbuilder',
							type: 'message'
						};
						
						bot.send(message);

					}
					catch(err){
						console.log(err);
					}
				}
				
			});
			
		});
		
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
};

//var connector = new builder.ConsoleConnector().listen();		//console test 
var bot = new builder.UniversalBot(connector);
builder.Prompts.configure( {maxRetries: 999} );

// Install First Run middleware and dialog
bot.use(builder.Middleware.firstRun({ version: 1.0, dialogId: '*:/firstRun' }));

bot.dialog('/', [

	function (session) {

		builder.Prompts.number(session, "Hi " + session.userData.name + ", what would you like to do?\n\r1. Fetch some information\n\r2. Change your name\n\r3. Subscribe\n\r4. Unsubscribe");
	
	},
	function(session, results){
		if(results.response == 1) {
			session.replaceDialog('/info');
		}
		else if( results.response == 2 ){
			session.replaceDialog('/change-name');
		}

		else if (results.response == 3) {
			if(!session.userData.ReceiveAlert && session.message.address.channelId == 'skype'){
				var query = "INSERT INTO AlertSubscription (ChannelId, ConvId, UserName, BotId, UserId, ServiceURL) VALUES ('" + session.message.address.channelId + "', '" + session.message.address.conversation.id + "', '" + session.userData.name + "', '" + session.message.address.bot.id + "', '" + session.message.address.user.id + "', '" + session.message.address.serviceUrl + "');";
				sql.connect(config, function(err) {
					if(err) {
						session.send("DB ERROR");
						session.endDialog();
					}
					var request = new sql.Request();
					
					request.query(query, function(err, recordset){
						console.log(err);
						if(err == undefined) session.userData.ReceiveAlert = true;
						var msg = {
							text: "You are now subscribed.",
							dialog: '/'
						};
						send_msg(session, msg);
					});
					
				});
			}
			else if(session.userData.ReceiveAlert && session.message.address.channelId == 'skype'){
				var msg = {
					text: "You have already subscribed.",
					dialog: '/'
				};
				send_msg(session, msg);
			}
			else{
				var msg = {
					text: "Sorry, only Skype users can subscribe.",
					dialog: '/'
				};
				send_msg(session, msg);
			}
		}
		else if(results.response == 4){
			if(session.userData.ReceiveAlert && session.message.address.channelId == 'skype'){
				var query = "DELETE FROM AlertSubscription WHERE UserId = '" + session.message.address.user.id + "'";
				sql.connect(config, function(err) {
					if(err) {
						session.send("DB ERROR");
						session.endDialog();
					}
					var request = new sql.Request();
					
					request.query(query, function(err, recordset){
						console.log(err);
						session.userData.ReceiveAlert = false;
						var msg = {
							text: "You have unsubscribed.",
							dialog: '/'
						};
						send_msg(session, msg);
					});
					
				});
			}
			else{
				var msg = {
					text: "You are not subscribed.",
					dialog: '/'
				};
				send_msg(session, msg);
			}
			
		}
			
		else {
			var msg = {
				text: "I can't understand. Try again.",
				dialog: '/'
			};
			send_msg(session, msg);
		}

	}
	
]);

bot.dialog('/info', [
	function(session){
		
		builder.Prompts.number(session, "What would you like to know about?\n\r1. Current status\n\r2. Previous warnings");
	
	},
	function(session, results){
		if(results.response){
			if(results.response == 1) {
				var value, time;
				sql.connect(config, function(err) {
					if(err) {
						session.send("DB ERROR");
						session.endDialog();
					}
					//console.log(err);
					var request = new sql.Request();
					var query = 'SELECT TOP 1 Chl_1_Overall,Chl_2_Overall,Channel_1_gSE_Overall,Channel_2_gSE_Overall,Result,Timestamp FROM Vibration ORDER BY Timestamp DESC';
					request.query(query, function(err, recordset){
						
						send_msg_query(recordset, 1, session, send_msg);

					});
					
				});

			}
			else if( results.response == 2 ){
				session.replaceDialog('/query-interval');
			}
			else {
				var msg = {
					text: "I can't understand. Try again.",
					dialog: '/info'
				};
				send_msg(session, msg);
			}
		}
		else{
			session.replaceDialog('/');
		}
	}
]);

bot.dialog('/change-name', [
	function (session) {
		builder.Prompts.text(session, "Your new name please?");
		
	},
	function (session, results) {
		session.userData.name = results.response;

		if(session.message.address.channelId == 'skype'){
			var query = "UPDATE AlertSubscription SET UserName = '" + results.response + "' WHERE UserId = '" + session.message.address.user.id + "'";
			sql.connect(config, function(err) {
				if(err) {
					session.send("DB ERROR");
					session.endDialog();
				}
				var request = new sql.Request();
				
				request.query(query, function(err, recordset){
					console.log("UserName updated");
					
				});
				
			});
		}
		var msg = {
			text: "Great. We've recorded your new name.",
			dialog: '/'
		};
		send_msg(session, msg);
	}
]);

bot.dialog('/query-interval', [
	function(session){
		builder.Prompts.number(session, "How many records would you like to query? 1 - 7, 0 to quit");
	},
	function(session, results){
		if(results.response){
			if(results.response >= 1 && results.response <= 7){
				var query = 'SELECT TOP ' + results.response.toString() + ' Result,Timestamp FROM Vibration ORDER BY Timestamp DESC';
				sql.connect(config, function(err) {
					if(err) {
						session.send("DB ERROR");
						session.endDialog();
					}
					var request = new sql.Request();
					
					request.query(query, function(err, recordset){
						console.log(recordset.length);
						send_msg_query(recordset, 2, session, send_msg);
					});
					
				});
				
			}
			else{
				var msg = {
					text: "Invalid input. Try Again.",
					dialog: '/query-interval'
				};
				send_msg(session, msg);
			}
		}
		else{
			session.replaceDialog('/');
		}
	}]
);

bot.dialog('/firstRun', [
	function (session) {
		builder.Prompts.text(session, "Hello... What's your name?");
		
	},
	function (session, results) {
		session.userData.name = results.response;
		session.userData.ReceiveAlert = false;
		session.replaceDialog('/'); 
	}
]);

function send_msg_query(recordset, choice, session, callback){
	var msg;
	if(recordset != null){
		if(choice == 1){
			msg = {
				text: "Status at " + recordset[0].Timestamp + " is " + recordset[0].Result + ". \n\rChl_1_Overall: " + recordset[0].Chl_1_Overall + "\n\rChl_2_Overall: " + recordset[0].Chl_2_Overall + "\n\rChannel_1_gSE_Overall: " + recordset[0].Channel_1_gSE_Overall + "\n\rChannel_2_gSE_Overall: " + recordset[0].Channel_2_gSE_Overall,
				dialog: '/'
			};
		}
		else if(choice == 2){
			msg = {
				text: recordset[0].Result + " at " + recordset[0].Timestamp + '\n\r',
				dialog: '/'
			};
			for(i = 1; i < recordset.length; ++i){
				msg.text += (recordset[i].Result + " at " + recordset[i].Timestamp + '\n\r');
			}
		}
		
	}

	callback(session, msg);
}

function send_msg(session, msg){
	session.send(msg.text);
	session.replaceDialog(msg.dialog);
}
