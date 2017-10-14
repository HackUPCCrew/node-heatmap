var express = require("express");

var path = require('path');

//const pg = require('pg');
//const parse = require('pg-connection-string').parse;
const R = require('ramda');

//const pgUrl = process.env.DATABASE_URL;
//const pgOptions = R.merge(parse(pgUrl), {ssl: true});

const mongoEndPoint = "mongodb://34.224.70.221:8080/crimedata"
const MongoClient = require('mongodb').MongoClient

//const pool = new pg.Pool(pgOptions);

var app = express();
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.engine('html', require('ejs').renderFile);

  app.use(express.static(path.join(__dirname, 'js')));
  app.use(express.static(path.join(__dirname, 'img')));
  app.use(express.favicon(__dirname + '/images/favicon.ico'));

  app.use(express.logger());
});

const dayVals = {'Monday':0, 'Tuesday': 1, 'Wednesday':2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6 };
app.get('/', handleMongoRequest);
app.get('/:year', handleMongoRequest);

function handleMongoRequest(req, res) {
  MongoClient.connect(mongoEndPoint, function(err, db) {
    console.log("Connected correctly to server");

    const currentYear = new Date().getFullYear();
    const requestedYear = Number(req.params.year) || currentYear;

    var collection = db.collection('crimedata');

    collection.find({
      Dates: {
          $gte: new Date(""+requestedYear+"-01-01T00:00:00.000Z"),
          $lt: new Date(""+(requestedYear+1)+"-01-01T00:00:00.000Z")
      }
    }).toArray((err,docs) => {
      if (err) {
        console.log(err);
      }
      console.log(docs);

      const crimes = R.map((c) => {
        const date = new Date(c.Dates);
        return [Number(c.Y), Number(c.X), dayVals[c.DayOfWeek], date.getMonth(), date.getDate()];
      }, docs);

      const years = R.prepend(2013, R.range(2017, currentYear+1));
      const data = {
        years: years,
        crimes: crimes,
        year: requestedYear,
      };

      console.log(data)

      res.render('index.html', { data: data });
      db.close();

      return;
    })
  });
}


function handleDataRequest(req, res) {
  res.header("Content-Type", "text/html; charset=utf-8");

  pool.connect(function(err, client, done) {
    if(err) {
      return console.error('error fetching client from pool', err);
    }

    const currentYear = new Date().getFullYear();
    const requestedYear = Number(req.params.year) || currentYear;
    console.log(requestedYear);
    client.query(`SELECT * from crimes where at between '${requestedYear}-01-01'::DATE and '${requestedYear+1}-01-01'::DATE order by at`, function(err, result) {
      done();

      if(err) {
        return console.error('error running query', err);
      }

      const crimes = R.map((c) => {
        const date = new Date(c.at);
        return [Number(c.latitude), Number(c.longitude), crimeTypes[c.type], date.getMonth(), date.getDate()];
      }, result.rows);

      const years = R.prepend(2013, R.range(2017, currentYear+1));
      const data = {
        years: years,
        crimes: crimes,
        year: requestedYear,
      };

      res.render('index.html', { data: data });
      return;
    });
  });
}

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
