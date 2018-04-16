var config = require('./config'),
	Twitter = require('simple-twitter'),
	bot = new Twitter(config.twitter.consumerKey, config.twitter.consumerSecret, config.twitter.token, config.twitter.tokenSecret),
	request = require('request'),
	parameters = {
		url: 'https://api-v3.mbta.com/alerts',
		qs: {
			api_key: config.mbta.key,
			route: config.mbta.route
		},
		json: true
	},
	last_checked = Math.floor(new Date().getTime() / 1000) - (config.continuous ? 0 : config.interval / 1000);

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
	}, function(error) {
		if (error && config.debug) {
			console.log(error);
		}
	});
}

/*
 * Make the request
 * Note: This function is run recursively if "continuous" is set in the config
 */
function main() {
	request(parameters, function(error, response, body) {
		if (error && config.debug) {
			console.log(error);
		} else if (body && body.data) {
			
			// Parse all available alerts
			var timestamp;
			body.data.forEach(function(alert) {
				
				// Check alert timestamp against last checked timestamp
				if (alert.attributes && alert.attributes.created_at) {
					timestamp = Date.parse(alert.attributes.created_at) / 1000;
					if (timestamp > last_checked) {
						if (config.continuous) {
							last_checked = timestamp;
						}
						
						// Tweet the alert
						tweet(sanitize(alert.attributes.short_header || alert.attributes.header));
					}
				}
			});
		}
		
		// Restart the process
		if (config.continuous) {
			setTimeout(main, config.interval);
		}
	});
}

// Begin polling the API
main();
