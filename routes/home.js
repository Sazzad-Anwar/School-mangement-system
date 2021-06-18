//jshint esversion:8
const express = require("express");
const router  = express.Router();
const {ensureAuthenticated, forwardAuthenticated} = require('../configuration/auth');
router.use(express.static("public"));
router.use(express.urlencoded({extended: false}));


router.get("/", forwardAuthenticated,(req, res) => res.render("home"));
router.get('/dashboard', ensureAuthenticated,(req, res)=> res.render("teacherDashboard"));

module.exports= router;