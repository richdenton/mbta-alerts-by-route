var config = require('./config'),
	Twitter = require('simple-twitter'),
	bot = new Twitter(config.consumerKey, config.consumerSecret, config.token, config.tokenSecret),
	request = require('request'),
	parameters = {
		url: 'http://realtime.mbta.com/developer/api/v2/alertsbyroute',
		qs: {
			api_key: config.mbta.key,
			route: config.mbta.route
		},
		json: true
	},
	last_checked = Math.floor(new Date().getTime() / 1000);

/*
 * Ensure content will fit in a tweet
 * @param message to be checked as string
 */
function sanitize(message) {
	
	// Determine max length, ignoring links
	var max_length = 131;
	if (message.indexOf('mbta.com') > -1) {
		max_length -= 23;
	}
	
	// Append ellipses for longer messages
	if (message.length > max_length && message.length - 9 > max_length) {
		message = message.slice(0, max_length) + '...';
	}
	
	// Append #mbta when possible
	if (message.length + 5 < max_length) {
		message += ' #mbta';
	}
	return message;
}

/*
 * Post to Twitter using simple-twitter
 * @param message to post as string
 */
function tweet(message) {
	bot.post('statuses/update', {
		status: message
	}, function (error) {
		if (error) {
			console.log(error);
		}
	});
	console.log('Tweeting: ' + message);
}

/*
 * The main, recursive loop
 */
function main() {
	request(parameters, function(error, response, body) {
		if (error) {
			console.log(error);
		} else if (body && body.alerts) {
			
			// Parse all available alerts
			body.alerts.forEach(function(alert) {
				
				// Check alert timestamp against last checked timestamp
				if (alert.created_dt && alert.created_dt > last_checked) {
					tweet(sanitize(alert.short_header_text || alert.header_text));
					last_checked = alert.created_dt;
				}
			});
		}
		
		// Restart the process
		setTimeout(main, config.interval);
	});
}

// Begin polling the API
main();