//jshint esversion:8
const express = require("express");
const flash = require("connect-flash");
const mongoose = require('mongoose');
const passport = require("passport");
const session = require("express-session");
var conn = require("./configuration/database");
const studentDB = require('./model/students');
const morgan = require("morgan");
const { ensureAuthenticated, forwardAuthenticated } = require('./configuration/auth');

const app = express();
require('./configuration/passport')(passport);

//setup some middle-wear function
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
const PORT = 5000;

studentDB.find({}, (err, found) => {
  if (found.length == 0) {
    var admin = new studentDB({
      students_name: '.',
      students_id: '2021012345',
      Class: '.',
      section: '.',
      father_name: '.',
      mother_name: '.',
      dateOfBirth: '.',
      contact_number: '.',
      contact_rel: '.',
      admission_date: '.',
      session: '.',
      image: '.',
      password: '$2a$10$C97LbUqibqdLrm9FBNFRX.pz9Obqokne2jPL71Ti1YKUDTylXQ5e2',
      role: 'admin'
    });
    admin.save();
  }
});


app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

app.use(morgan('dev'));
app.use(flash());

app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

app.use(passport.initialize());
app.use(passport.session());

//-------- web pages ---------//

app.post('/', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/',
    failureFlash: true
  })(req, res, next);
});

//----------------- initializing the routes ------------------//

app.use("/student", require("./routes/student.js"));
app.use("/teacher", require("./routes/teacher.js"));
app.use("/admin", require("./routes/admin.js"));
app.use("/image", require("./routes/student.js"));
app.use("/", require("./routes/home.js"));

app.listen(PORT, console.log(`Server started on port ${PORT}`));