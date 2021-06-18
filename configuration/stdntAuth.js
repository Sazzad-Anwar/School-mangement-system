module.exports = {
    //This is custom middlewear function which will resist a user to move into dashbord,photo posting page if a user is not 
    stdntensureAuthenticated: function(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      req.flash('error_msg', 'Please log in first'); 
      res.redirect('/student/login');
    },
  
    stdntforwardAuthenticated: function(req, res, next) {
      if (!req.isAuthenticated()) {
        return next();
      }
      req.flash('error_msg', 'Please log Out to go back in login page'); 
      res.redirect('/student/dashboard');      
    },
};