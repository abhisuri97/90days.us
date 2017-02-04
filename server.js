/**
 * This is the server that does everything. It serves the index.html web page.
 * It opens a streaming connection to Twitter and retrieves the tweets. It
 * publishes all of the geotagged tweets to a Socket.io socket.
 */

/**
 * EXPRESS BOILERPLATE GOES HERE
 */
var express = require('express'),
    app = express(),
    http = require('http').Server(app);
app.use(express.static('public'));
// Serve index.html at the root.
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Serve static files in the public directory.

// Run on port 3000.
http.listen(process.env.PORT || 3000, function() {
  console.log('listening on 3000');
});

/**
 * Create a stupid EventEmitter so that we can decouple the Twitter listener
 * and the socket.io socket.
 */
var EventEmitter = require('events'),
    util = require('util');

function TweetEmitter() {
  EventEmitter.call(this);
}
util.inherits(TweetEmitter, EventEmitter);

var tweetEmitter = new TweetEmitter();

/**
 * Here's all the socket.io stuff
 */

var io = require('socket.io')(http);

tweetEmitter.on('tweet', function(tweet) {
  console.log(tweet);
  io.emit('tweet', tweet);
});

tweetEmitter.on('count', function(count) {
  console.log(count);
  io.emit('count', count);
});
// a helper function to average coordinate pairs
function average(coordinates) {
  var n = 0, lon = 0.0, lat = 0.0;
  coordinates.forEach(function(latLongs) {
    latLongs.forEach(function(latLong) {
      lon += latLong[0];
      lat += latLong[1];
      n += 1;
    })
  });
  return [lon / n, lat / n];
}

// Twitter stuff

var Twitter = require('node-tweet-stream'),
  credentials = require('./credentials.js'),
  client = new Twitter(credentials);

client.track('trump');
client.track('muslimban');
client.track('NoBanNoWall');
client.track('ban');
client.track('90days');
var count = 0;
client.on('tweet', function(tweet) {
  // ... that has the `place` field populated ...
  if (count % 47 === 0) {
    tweetEmitter.emit('count', count);
    console.log('emitted ' + count);
  } count++;
  if (tweet.place) {
    // ... extract only the fields needed by the client ...
    var tweetSmall = {
      id: tweet.id_str,
      user: tweet.user.screen_name,
      text: tweet.text,
      placeName: tweet.place.full_name,
      latLong: average(tweet.place.bounding_box.coordinates),
    }
    // ... and notify the tweetEmitter.
    tweetEmitter.emit('tweet', tweetSmall);
  }
});
