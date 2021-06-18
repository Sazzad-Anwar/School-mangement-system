//jshint esversion:8
const express = require("express");
const router  = express.Router();

router.use(express.static("public"));
router.use(express.urlencoded({extended: false}));


router.get("/", (req, res) => res.render("home"));


module.exports= router;