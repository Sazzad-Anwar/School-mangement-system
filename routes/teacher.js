const express = require('express');
const router = express.Router();
// const teacher = require("./model/teacher");

router.use(express.static("public"));
router.use(express.urlencoded({extended: false}));

router.get("/", (req, res)=> res.render("teacher_registration"));





module.exports = router;