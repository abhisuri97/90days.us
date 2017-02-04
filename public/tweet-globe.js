var width = 960,
    height = 960;

var projection = d3.geo.orthographic()
    .translate([width / 2, height / 2])
    .scale(width / 2 - 20)
    .clipAngle(90)
    .precision(0.6);

var canvas = d3.select("body").append("canvas")
    .attr("width", width)
    .attr("height", height);

var c = canvas.node().getContext("2d");

var path = d3.geo.path()
    .projection(projection)
    .context(c);

var title = d3.select(".title");

queue()
    .defer(d3.json, "/world-110m.json")
    .defer(d3.tsv, "/world-country-names.tsv")
    .await(ready);

function ready(error, world, names) {
  if (error) throw error;

  var globe = {type: "Sphere"},
      land = topojson.feature(world, world.objects.land),
      countries = topojson.feature(world, world.objects.countries).features,
      borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; });

  countries = countries.filter(function(d) {
    return names.some(function(n) {
      if (d.id == n.id) return d.name = n.name;
    });
  }).sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  // Open up a socket to the website.
  var socket = io({ "force new connection" : true });

  // Yes, I know how ugly this is.
  function makeHTML(tweet) {
    return [
      '<div class="user">',
      '<a href="https://twitter.com/', tweet.user, '" target="_blank">', '@', tweet.user, '</a>',
      '<h1>', tweet.placeName, '</h1>',
      '<div class="tweet">',
      '<a href="https://twitter.com/', tweet.user, '/status/', tweet.id, '" target="_blank">',
      tweet.text, '</a>', '</div>'
    ].join('');
  }

  // And whenever you get a tweet message from the socket...
  socket.on('tweet', function(tweet) {
    console.log(tweet);
    d3.transition()
      .duration(1250)
      .each("start", function() {
        title.html(makeHTML(tweet));
      })
      .tween("rotate", function() {
        var p = tweet.latLong,
            r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
        return function(t) {
          // Rotate the earth so that the new point is front and center.
          projection.rotate(r(t));
          // Erase the canvas.
          c.clearRect(0, 0, width, height);
          // Fill in all the landmasses gray.
          c.fillStyle = "#ccc", c.beginPath(), path(land), c.fill();
          // Draw the country borders in white.
          c.strokeStyle = "#fff", c.lineWidth = .5, c.beginPath(), path(borders), c.stroke();
          // Draw the earth's circumference in black.
          c.strokeStyle = "#000", c.lineWidth = 2, c.beginPath(), path(globe), c.stroke();
          // Get the canvas-coordinates of the latLong point, and draw a circle there.
          var center = projection(p);
          c.strokeStyle = "#000", c.fillStyle = "#f00", c.beginPath(), c.arc(center[0], center[1], 5, 0, 2 * Math.PI, false), c.lineWidth = 2, c.fill(), c.stroke();
        };
      });
  });
}

d3.select(self.frameElement).style("height", height + "px");
