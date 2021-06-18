//jshint esversion:10

//This passport is for user authentication method. here the passport-local method will work for this.
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs'); // initializing password encription method

// Load User model
const User = require('../model/students'); //initializing the user model of database


// Here is the full authentication function and this will be exported.
module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'students_id' }, (students_id, password, done) => {
      // Match user
      User.findOne({
        students_id: students_id
      }).then(user => {
        if (!user) {
          return done(null, false, { message: 'Login credentials do not matched' });
        }

        // Match password
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Password incorrect' });
          }
        });
      });
    })
  );

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
};
