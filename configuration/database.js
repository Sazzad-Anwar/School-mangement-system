//jshint esversion:8
const mongoose = require("mongoose");

var databaseServer = 'mongodb://localhost:27017/schoolMS';
var conn = mongoose.connect(databaseServer, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Database is connected to this application"))
.catch(err => console.log(err));

module.exports = conn;
