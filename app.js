/*****LICENSE HERE*****/
/******************
 * Copyright © 2017 Microsoft
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************/

var restify = require('restify'); 
var builder = require('botbuilder'); 
var sql = require('mssql');
var recognizer = new builder.LuisRecognizer(process.env.LUIS_ENDPOINT);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

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
var connectionPool = new sql.Connection(config);

// Setup Restify Server
var server = restify.createServer();
server.use(restify.bodyParser());

connectionPool.connect().then(() => {
	server.listen(process.env.PORT || process.env.port || 3000, () => {
		console.log('%s listening to %s', server.name, server.url); 
	});
}).catch((err) => {
	console.log(err);
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
				session.send(err.message);
				session.endDialog();
			}
			//console.log(err);
			var request = new sql.Request(connectionPool);
			
			request.query("SELECT * FROM AlertSubscription;", function(error, recordset){
				if (error) throw error;
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
						var time = new Date(msg.body.timestamp);

						var text = "WARNING: " + msg.body.result + " at " + time.toLocaleString() + " (UTC)\n\rProbability Score:\n\rNormal: " + msg.body.normal + "\n\rFan: " + msg.body.fan + "\n\rUnbalanced: " + msg.body.unbalanced;
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

//var connector = new builder.ConsoleConnector().listen();		//console test 
var bot = new builder.UniversalBot(connector);
builder.Prompts.configure( {maxRetries: 999} );
bot.use(builder.Middleware.firstRun({ version: 1.0, dialogId: '*:/firstRun' }));

bot.dialog('/', intents);

intents.matches('greetings', '/greetings');

intents.matches('menu', [
	function(session, args, next) {
		session.send('I can help you change your name, query some data, subscribe or cancel subscription. I can also help you check if your system is running normally.');
	},
]);

intents.matches('ChangeName', '/change-name');

intents.matches('Subscribe', [
	function(session, args, next) {
		if(session.message.address.channelId === 'skype'){
      var query = "SELECT * FROM AlertSubscription WHERE UserId='" + session.message.address.user.id + "' AND ServiceUrl= '" + session.message.address.serviceUrl + "'";

			var request = new sql.Request(connectionPool);
			request
        .query(query)   // make sure no previous subscription
        .then(function(recordset){
          if (recordset.length !== 0) {
            throw new Error("You have already subscribed.");
          }
          query = "INSERT INTO AlertSubscription (ChannelId, ConvId, UserName, BotId, UserId, ServiceURL) VALUES ('" + session.message.address.channelId + "', '" + session.message.address.conversation.id + "', '" + session.userData.name + "', '" + session.message.address.bot.id + "', '" + session.message.address.user.id + "', '" + session.message.address.serviceUrl + "');";
          var request2 = new sql.Request(connectionPool);
          request2
            .query(query)   // make sure no previous subscription
            .then(function(recordset){
              var msg = {
                text: "You are now subscribed.",
                dialog: '/'
              };
              sendMessage(session, msg);              
            })
            .catch(function(err) {
              session.send(err.message);
              session.endDialog();
            });
        })
        .catch(function(err) {
          session.send(err.message);
          session.endDialog();
        });
		}
		else{
			var msg = {
				text: "Sorry, only Skype users can subscribe.",
				dialog: '/'
			};
			sendMessage(session, msg);
		}
	}
]);

intents.matches('Unsubscribe', [
	function (session, args, next) {
		if(session.message.address.channelId === 'skype'){
			var query = "DELETE FROM AlertSubscription WHERE UserId = '" + session.message.address.user.id + "'";
			var request = new sql.Request(connectionPool);
			
			request.query(query, function(err, recordset, rowsAffected){
				if (err) {
					session.send(err.message);
					session.endDialog();
				}
        var msg = {
          text: "You have cancelled your subscription.",
          dialog: '/'
        };
        if (rowsAffected === 0) {
          msg.text = "You are not subscribed.";
        }
        sendMessage(session, msg);
			});
		}
		else{
			var msg = {
				text: "You are not subscribed.",
				dialog: '/'
			};
			sendMessage(session, msg);
		}
	},
]);

intents.matches('None', [
	function (session, args, next) {
		var msg = {
			text: "I can't understand. Try again.",
			dialog: '/'
		};
		sendMessage(session, msg);
	},
]);

intents.matches('Query', [
	function (session, args, next) {
		var value, time;
		var request = new sql.Request(connectionPool);
		if (args.entities.length === 0) {
			request
        .execute('USP_Vibration_Select_Count')
        .then(function (recordset) {
          console.log(recordset);
          sendQueryResult(recordset[0], 1, session, sendMessage);
        })
        .catch(function (err) {
          console.log(err);
        });
		} else if (!isNaN(parseInt(args.entities[0].entity))) {
      request
        .input('Count', sql.Int, parseInt(args.entities[0].entity))
        .execute('USP_Vibration_Select_Count')
        .then(function (recordset) {
          console.log(recordset);
          sendQueryResult(recordset[0], 2, session, sendMessage);
        })
        .catch(function (err) {
          console.log(err);
        });
		} else {
      request
        .input('Count', sql.Int, 5)
        .execute('USP_Vibration_Select_Count')
        .then(function (recordset) {
          console.log(recordset);
          sendQueryResult(recordset[0], 2, session, sendMessage);
        })
        .catch(function (err) {
          console.log(err);
        });
		}

	},
]);

intents.matches('anomaly', [
  function (session, args, next) {
    var request = new sql.Request(connectionPool);
    request.execute('USP_EventLogSelectOne')
      .then(function (recordset) {
        var entry = recordset[0][0];
        if (entry.CurrState === 'Normal') {
          session.send('Your system is running well!');
        } else {
          session.send('Your system has something wrong now.');
        }
        session.send('The state of your system changed from ' + entry.PrevState + ' to ' + entry.CurrState + ' at ' + entry.Timestamp + '.');
      })
      .catch(function (err) {
        console.log(err);
      });
  },
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
					session.send(err.message);
					session.endDialog();
				}
				var request = new sql.Request(connectionPool);
				
				request.query(query, function(err, recordset){
					console.log("UserName updated");
					
				});
				
			});
		}
		var msg = {
			text: "Great. We've recorded your new name.",
			dialog: '/'
		};
		sendMessage(session, msg);
	}
]);

bot.dialog('/greetings', function(session, args, next) {
  session.send('Hi, ' + session.userData.name + '. What can I do for you? You can type "help" to see what I can do.');
  session.endDialog();
});

bot.dialog('/firstRun', [
	function (session) {
		var query = "SELECT * FROM AlertSubscription WHERE UserId='" + session.message.address.user.id + "' AND ServiceUrl= '" + session.message.address.serviceUrl + "'";

    var request = new sql.Request(connectionPool);
    request
      .query(query)   // if this user has subscribed, remember his name
      .then(function(recordset){
        console.log(recordset);
        if (recordset.length !== 0) {
          session.userData.name = recordset[0].UserName;
		      session.replaceDialog('/greetings'); 
        } else {
          builder.Prompts.text(session, "Hello, what's your name?");
        }
      })
      .catch(function(err) {
        session.send(err.message);
        session.endDialog();
      });
	},
	function (session, results) {
		session.userData.name = results.response;
		session.userData.ReceiveAlert = false;
		session.replaceDialog('/greetings'); 
	}
]);

function sendQueryResult(recordset, choice, session, callback){
	var msg;
	if(recordset != null){
		if(choice == 1){
			msg = {
				text: "Status at " + recordset[0].Timestamp + " is " + recordset[0].Result + ". \n\rCh1_Overall: " + recordset[0].Ch1_Overall + "\n\rCh2_Overall: " + recordset[0].Ch2_Overall + "\n\rCh1_gSE: " + recordset[0].Ch1_gSE + "\n\rCh2_gSE: " + recordset[0].Ch2_gSE,
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

function sendMessage(session, msg){
	session.send(msg.text);
	if (msg.dialog !== '/')
		session.replaceDialog(msg.dialog);
	else
		session.endDialog();
}
