//jshint esversion:8
const express = require("express");
const router = express.Router();
const method_override = require("method-override");
const studentDB = require("../model/students");
const bcrypt = require('bcryptjs');
const passport = require('passport');
const nurserySub = require("../model/nurserySubject");
const multer = require('multer');
const {ensureAuthenticated, forwardAuthenticated} = require('../configuration/auth');
const {stdntensureAuthenticated, stdntforwardAuthenticated} = require('../configuration/stdntAuth');
router.use(express.static("public"));
const fs = require('fs');
router.use(express.urlencoded({extended: true}));
router.use(method_override("_method"));

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads');
    },
    filename: function (req, file, cb) {
        let name = file
            .originalname
            .split(".");
        cb(null, Date.now() + "." + name[1]);
    }
})

var upload = multer({storage: storage})

var date = new Date();
const year = date.getFullYear();
let ID;

//------- loading the student registration page -----///
router.get("/", ensureAuthenticated, (req, res) => {
    studentDB
        .find()
        .countDocuments((err, count) => {
            for (var i = 0; i <= count; i++) {
                if (count == 0) {
                    ID = year * 10000;
                } else {
                    ID = year * 10000 + count;
                }
            }
            studentDB
                .find()
                .limit(1)
                .sort({$natural: -1})
                .then(student => {
                    if (student) {
                        res.render("student_registration", {
                            count: count,
                            student: student,
                            ID: ID + 1,
                            session: year
                        });
                    }
                });
        });
});

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect("/");
});

//------- loading the student registration page -----///
router.get("/registration", ensureAuthenticated, (req, res) => {
    if (req.user.role !== 'admin') {
        req.logout();
        req.flash('error_msg', "Not permitted to login");
        res.redirect("/");
    } else {
        studentDB
            .find()
            .countDocuments((err, count) => {
                for (var i = 0; i <= count; i++) {
                    if (count == 0) {
                        ID = year * 10000;
                    } else {
                        ID = year * 10000 + count;
                    }
                }
                studentDB
                    .find()
                    .limit(1)
                    .sort({$natural: -1})
                    .then(student => {
                        if (student) {
                            res.render("student_registration", {
                                count: count,
                                student: student,
                                ID: ID + 1,
                                session: year
                            });
                        }
                    });
            });
    }
});

// Saving the students details and posting it in Student info page

router.post("/registration", ensureAuthenticated, upload.single('photo'), (req, res) => {
    const {
        students_name,
        students_id,
        Class,
        section,
        father_name,
        mother_name,
        dateOfBirth,
        contact_number,
        contact_rel,
        admission_date,
        session,
        password,
        password1
    } = req.body;

    var ext = req
        .file
        .originalname
        .split('.');
    var mimetype = ext[1];
    let path = req
        .file
        .path
        .split("\\");
    let image = '../' + path[1] + "/" + path[2];

    studentDB
        .findOne({students_id: students_id})
        .then(student => {
            if (student) {
                req.flash("success_msg", " STUDENT ID IS ALREADY REGISTERED ");
                res.redirect("registration");
            } else {
                if (mimetype == "jpg" || mimetype == "png" || mimetype == 'JPG' || mimetype == 'JPEG' || mimetype == 'PNG' && password == password1) {
                    var salt = bcrypt.genSaltSync(10);
                    var password = bcrypt.hashSync(password1, salt);
                    const newStudent = new studentDB({
                        students_name,
                        students_id,
                        Class,
                        section,
                        father_name,
                        mother_name,
                        dateOfBirth,
                        contact_number,
                        contact_rel,
                        admission_date,
                        session,
                        image,
                        password
                    });
                    newStudent
                        .save()
                        .then(student => {
                            nurserySub.findOne({
                                students_id: students_id
                            }, (err, score) => {
                                const success_msg = " SUCCESSFULLY REGISTERED ";
                                res.render("student_info", {student, success_msg, score});
                            });
                        });
                } else {
                    req.flash('error_msg', 'This is not an image');
                    const path = "./public/uploads/" + req.file.filename;
                    fs.unlink(path, (err) => {
                        if (err) 
                            throw err;
                        res.redirect('/registration');
                    });
                }
            }
        })
        .catch(err => console.log(err));
});

// Search The students details from navbar Check the student's details from the
// Class details

router.post("/info", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    nurserySub.findOne({
        students_id: id
    }, (err, score) => {
        studentDB
            .findOne({students_id: id})
            .then(student => {
                if (student) {
                    res.render("student_info", {student, score});
                } else {
                    const error_msg = ' STUDENT ID IS NOT REGISTERED ';
                    res.render("student_info", {
                        student: false,
                        error_msg
                    });
                }

            });
    });

});

// Deleting the students details from the student info page

router.delete("/delete", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const students_id = req.body.students_id;
    nurserySub
        .findOneAndDelete({students_id: students_id})
        .then(score => {
            if (score) {
                const success_msg = " STUDENT'S DETAILS AND SCORED HAVE BEEN DELETED ";
                res.render("student_info", {
                    student: false,
                    success_msg
                });
            } else {
                // res.send("<h1 style='text-align:center;font-size:40px'>DATA DELETION IS
                // ERROR</h1>");
                res.render("student_info", {
                    student: false,
                    success_msg
                });
            }
        })
        .catch(err => (err));
    studentDB
        .findByIdAndDelete(id)
        .then(student => {
            if (student) {
                const success_msg = " STUDENT'S DETAILS AND SCORED HAVE BEEN DELETED ";
                res.render("student_info", {
                    student: false,
                    success_msg
                });
            } else {
                res.send("<h1 style='text-align:center;font-size:40px'>DATA DELETION IS ERROR</h1>");
            }
        })
        .catch(err => (err));
});

// Seach the Class details from the navbar
router.post("/classInfo", ensureAuthenticated, (req, res) => {
    const {id, Class, section, session} = req.body;
    studentDB
        .find({Class: Class, section: section, session: session})
        .countDocuments(function (err, count) {
            nurserySub.findOne({
                students_id: id
            }, (err, score) => {
                studentDB
                    .find({Class: Class, section: section, session: session})
                    .sort({students_id: 1})
                    .then(Class => {
                        if (Class) {
                            res.render("class_details", {
                                Class,
                                score,
                                selectedClass: req.body.Class,
                                selectedSection: req.body.section,
                                selectedSession: req.body.session,
                                count
                            });
                        }
                        if (!Class) {
                            const error_msg = " CLASS IS NOT FOUND ";
                            res.render("class_details", {Class, error_msg});
                        }
                    })
                    .catch(err => {
                        const error_msg = " CONTENT IS NOT FOUND ";
                        res.render("class_details", {
                            Class: false,
                            error_msg
                        });
                    });
            });
        });
});

//----------- Edit option in student Info page ----------///
router.post("/edit", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    studentDB
        .findById(id)
        .then(student => {
            if (student) {
                student.role = 'admin';
                res.render("studentInfoEdit", {student});
            } else {
                res.send("<h1 style='text-align:center;font-size:40px'> PROBLEM FOUND ON HANDLING EDITING " +
                        "BUTTON </h1>");
            }
        })
        .catch(err => console.log(err));
});

router.post("/infoEdit", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    studentDB
        .findById(id)
        .then(student => {
            if (student) {
                res.render("studentInfoEdit", {student});
            } else {
                res.send("<h1 style='text-align:center;font-size:40px'> PROBLEM FOUND ON HANDLING EDITING " +
                        "BUTTON </h1>");
            }
        })
        .catch(err => console.log(err));
});

//-------------students Editing functionality methods --------------//

router.post("/name", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            students_name: req.body.name
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/Class", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            Class: req.body.Class
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/section", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            section: req.body.section
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("404 Error !"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/admission_date", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            admission_date: req.body.admission_date
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/session", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            session: req.body.session
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/father_name", ensureAuthenticated, (req, res) => {
    const {id, father} = req.body;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            father_name: father
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/mother_name", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            mother_name: req.body.mother
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("404 Error !"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/dateOfBirth", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            dateOfBirth: req.body.dateOfBirth
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/contact_number", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            contact_number: req.body.contact_number
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/contact_rel", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            contact_rel: req.body.contact_rel
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

router.post("/contact_rel", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const success_msg = "Updated";
    studentDB.updateOne({
        _id: id
    }, {
        $set: {
            contact_rel: req.body.contact_rel
        }
    }).then(student => {
        if (student) {
            studentDB
                .findById(id)
                .then(student => {
                    res.render("studentInfoEdit", {student, success_msg});
                })
                .catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
        }
    }).catch(err => res.send("<h1 style='text-align:center;font-size:40px'> EORROR ! </h1>"));
});

//-------------- Resuslt Entry Modal --------------//
router.post('/resultEntry', ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    studentDB.findOne({
        students_id: id
    }, (err, student) => {
        nurserySub.findOne({
            students_id: id
        }, (err, score) => {
            if (student && score) {
                req.flash("success_msg", " STUDENT'S SCORE IS ALREADY TAKEN ! CHECK RESULTS ");
                res.redirect("/dashboard");
            } else if (student && !score) {
                if (student.Class == 'Nursery' || student.Class == "Play" || student.Class == "1" || student.Class == "2" || student.Class == "3") {
                    res.render("nurseryResultEntry", {student});
                }
                if (student.Class == '4' || student.Class == "5") {
                    console.log("not found");
                }
                if (student.Class !== 'Intermediate first year' || student.Class !== "Intermediate second year") {
                    console.log("not found");
                } else {
                    console.log("not found");
                }
            } else {
                req.flash("error_msg", " ID IS NOT FOUND ! ");
                res.redirect("registration");
            }
        });
    });
});

// student result input button search
router.post("/nursery", ensureAuthenticated, (req, res) => {
    const {
        bangla_firstSem,
        bangla_secondSem,
        bangla_thirdSem,
        english_firstSem,
        english_secondSem,
        english_thirdSem,
        math_firstSem,
        math_secondSem,
        math_thirdSem,
        religion_firstSem,
        religion_secondSem,
        religion_thirdSem,
        general_knowledge_firstSem,
        general_knowledge_secondSem,
        general_knowledge_thirdSem,
        drawing_firstSem,
        drawing_secondSem,
        drawing_thirdSem,
        students_id
    } = req.body;

    nurserySub.findOne({
        students_id: students_id
    }, (err, score) => {
        studentDB.findOne({
            students_id: students_id
        }, (err, student) => {
            if (student && !score) {
                const score = new nurserySub({
                    bangla: {
                        firstSem: bangla_firstSem,
                        secondSem: bangla_secondSem,
                        thirdSem: bangla_thirdSem
                    },
                    english: {
                        firstSem: english_firstSem,
                        secondSem: english_secondSem,
                        thirdSem: english_thirdSem
                    },
                    math: {
                        firstSem: math_firstSem,
                        secondSem: math_secondSem,
                        thirdSem: math_thirdSem
                    },
                    religion: {
                        firstSem: religion_firstSem,
                        secondSem: religion_secondSem,
                        thirdSem: religion_thirdSem
                    },
                    general_knowledge: {
                        firstSem: general_knowledge_firstSem,
                        secondSem: general_knowledge_secondSem,
                        thirdSem: general_knowledge_thirdSem
                    },
                    drawing: {
                        firstSem: drawing_firstSem,
                        secondSem: drawing_secondSem,
                        thirdSem: drawing_thirdSem
                    },
                    students_id: students_id
                });

                var b1stgpa,
                    b2ndgpa,
                    b3rdgpa,
                    e1stgpa,
                    e2ndgpa,
                    e3rdgpa,
                    m1stgpa,
                    m2ndgpa,
                    m3rdgpa,
                    r1stgpa,
                    r2ndgpa,
                    r3rdgpa,
                    g1stgpa,
                    g2ndgpa,
                    g3rdgpa,
                    d1stgpa,
                    d2ndgpa,
                    d3rdgpa,
                    b1stgradePoint,
                    b2ndgradePoint,
                    b3rdgradePoint,
                    e1stgradePoint,
                    e2ndgradePoint,
                    e3rdgradePoint,
                    m1stgradePoint,
                    m2ndgradePoint,
                    m3rdgradePoint,
                    r1stgradePoint,
                    r2ndgradePoint,
                    r3rdgradePoint,
                    g1stgradePoint,
                    g2ndgradePoint,
                    g3rdgradePoint,
                    d1stgradePoint,
                    d2ndgradePoint,
                    d3rdgradePoint,
                    firstSemGrade,
                    secondSemGrade,
                    thirdSemGrade,
                    overAllGrade,
                    overAllTotalGrade,
                    totalAverageMarks;

                var totalThirdSem,
                    thirdSemAverage,
                    tnumber;
                totalThirdSem = score.bangla.thirdSem + score.english.thirdSem + score.math.thirdSem + score.religion.thirdSem + score.general_knowledge.thirdSem + score.drawing.thirdSem;
                tnumber = totalThirdSem / 6;
                thirdSemAverage = tnumber.toPrecision(4);

                var totalFirstSem,
                    average,
                    fnumber;
                totalFirstSem = score.bangla.firstSem + score.english.firstSem + score.math.firstSem + score.religion.firstSem + score.general_knowledge.firstSem + score.drawing.firstSem;
                fnumber = totalFirstSem / 6;
                average = fnumber.toPrecision(4);

                var totalSecondSem,
                    secondSemAverage,
                    Snumber;
                totalSecondSem = score.bangla.secondSem + score.english.secondSem + score.math.secondSem + score.religion.secondSem + score.general_knowledge.secondSem + score.drawing.secondSem;
                Snumber = totalSecondSem / 6;
                secondSemAverage = Snumber.toPrecision(4);

                // For total average marks calculation
                totalAverageMarks = ((fnumber + Snumber + tnumber) / 3).toPrecision(4);

                //  Grading detection and showing the grade point  FIRST SEMESTER SUBJECTS'
                // marks 80-100
                if (score.bangla.firstSem >= 80) {
                    b1stgpa = "A+";
                    b1stgradePoint = 5.00;
                }
                if (score.english.firstSem >= 80) {
                    e1stgpa = "A+";
                    e1stgradePoint = 5.00;
                }
                if (score.math.firstSem >= 80) {
                    m1stgpa = "A+";
                    m1stgradePoint = 5.00;
                }
                if (score.religion.firstSem >= 80) {
                    r1stgpa = "A+";
                    r1stgradePoint = 5.00;
                }
                if (score.general_knowledge.firstSem >= 80) {
                    g1stgpa = "A+";
                    g1stgradePoint = 5.00;
                }
                if (score.drawing.firstSem >= 80) {
                    d1stgpa = "A+";
                    d1stgradePoint = 5.00;
                }

                // marks 70-80
                if (score.bangla.firstSem >= 70 && score.bangla.firstSem < 80) {
                    b1stgpa = "A";
                    b1stgradePoint = 4.00;
                }
                if (score.english.firstSem >= 70 && score.english.firstSem < 80) {
                    e1stgpa = "A";
                    e1stgradePoint = 4.00;
                }
                if (score.math.firstSem >= 70 && score.math.firstSem < 80) {
                    m1stgpa = "A";
                    m1stgradePoint = 4.00;
                }
                if (score.religion.firstSem >= 70 && score.religion.firstSem < 80) {
                    r1stgpa = "A";
                    r1stgradePoint = 4.00;
                }
                if (score.general_knowledge.firstSem >= 70 && score.general_knowledge.firstSem < 80) {
                    g1stgpa = "A";
                    g1stgradePoint = 4.00;
                }
                if (score.drawing.firstSem >= 70 && score.drawing.firstSem < 80) {
                    d1stgpa = "A";
                    d1stgradePoint = 4.00;
                }
                // markd 60-70
                if (score.bangla.firstSem >= 60 && score.bangla.firstSem < 70) {
                    b1stgpa = "A-";
                    b1stgradePoint = 3.50;
                }
                if (score.english.firstSem >= 60 && score.english.firstSem < 70) {
                    e1stgpa = "A-";
                    e1stgradePoint = 3.50;
                }
                if (score.math.firstSem >= 60 && score.math.firstSem < 70) {
                    m1stgpa = "A-";
                    m1stgradePoint = 3.50;
                }
                if (score.religion.firstSem >= 60 && score.religion.firstSem < 70) {
                    r1stgpa = "A-";
                    r1stgradePoint = 3.50;
                }
                if (score.general_knowledge.firstSem >= 60 && score.general_knowledge.firstSem < 70) {
                    g1stgpa = "A-";
                    g1stgradePoint = 3.50;
                }
                if (score.drawing.firstSem >= 60 && score.drawing.firstSem < 70) {
                    d1stgpa = "A-";
                    d1stgradePoint = 3.50;
                }

                // marks 50-60
                if (score.bangla.firstSem >= 50 && score.bangla.firstSem < 60) {
                    b1stgpa = "B";
                    b1stgradePoint = 3.00;
                }
                if (score.english.firstSem >= 50 && score.english.firstSem < 60) {
                    e1stgpa = "B";
                    e1stgradePoint = 3.00;
                }
                if (score.math.firstSem >= 50 && score.math.firstSem < 60) {
                    m1stgpa = "B";
                    m1stgradePoint = 3.00;
                }
                if (score.religion.firstSem >= 50 && score.religion.firstSem < 60) {
                    r1stgpa = "B";
                    r1stgradePoint = 3.00;
                }
                if (score.general_knowledge.firstSem >= 50 && score.general_knowledge.firstSem < 60) {
                    g1stgpa = "B";
                    g1stgradePoint = 3.00;
                }
                if (score.drawing.firstSem >= 50 && score.drawing.firstSem < 60) {
                    d1stgpa = "B";
                    d1stgradePoint = 3.00;
                }

                // marks 40-50
                if (score.bangla.firstSem >= 40 && score.bangla.firstSem < 50) {
                    b1stgpa = "C";
                    b1stgradePoint = 2.00;
                }
                if (score.english.firstSem >= 40 && score.english.firstSem < 50) {
                    e1stgpa = "C";
                    e1stgradePoint = 2.00;
                }
                if (score.math.firstSem >= 40 && score.math.firstSem < 50) {
                    m1stgpa = "C";
                    m1stgradePoint = 2.00;
                }
                if (score.religion.firstSem >= 40 && score.religion.firstSem < 50) {
                    r1stgpa = "C";
                    r1stgradePoint = 2.00;
                }
                if (score.general_knowledge.firstSem >= 40 && score.general_knowledge.firstSem < 50) {
                    g1stgpa = "C";
                    g1stgradePoint = 2.00;
                }
                if (score.drawing.firstSem >= 40 && score.drawing.firstSem < 50) {
                    d1stgpa = "C";
                    d1stgradePoint = 2.00;
                }

                // marks 33-40
                if (score.bangla.firstSem >= 33 && score.bangla.firstSem < 40) {
                    b1stgpa = "D";
                    b1stgradePoint = 1.00;
                }
                if (score.english.firstSem >= 33 && score.english.firstSem < 40) {
                    e1stgpa = "D";
                    e1stgradePoint = 1.00;
                }
                if (score.math.firstSem >= 33 && score.math.firstSem < 40) {
                    m1stgpa = "D";
                    m1stgradePoint = 1.00;
                }
                if (score.religion.firstSem >= 33 && score.religion.firstSem < 40) {
                    r1stgpa = "D";
                    r1stgradePoint = 1.00;
                }
                if (score.general_knowledge.firstSem >= 33 && score.general_knowledge.firstSem < 40) {
                    g1stgpa = "D";
                    g1stgradePoint = 1.00;
                }
                if (score.drawing.firstSem >= 33 && score.drawing.firstSem < 40) {
                    d1stgpa = "D";
                    d1stgradePoint = 1.00;
                }

                // marks 00-32
                if (score.bangla.firstSem >= 0 && score.bangla.firstSem < 33) {
                    b1stgpa = "F";
                    b1stgradePoint = 0.00;
                }
                if (score.english.firstSem >= 0 && score.english.firstSem < 33) {
                    e1stgpa = "F";
                    e1stgradePoint = 0.00;
                }
                if (score.math.firstSem >= 0 && score.math.firstSem < 33) {
                    m1stgpa = "F";
                    m1stgradePoint = 0.00;
                }
                if (score.religion.firstSem >= 0 && score.religion.firstSem < 33) {
                    r1stgpa = "F";
                    r1stgradePoint = 0.00;
                }
                if (score.general_knowledge.firstSem >= 0 && score.general_knowledge.firstSem < 33) {
                    g1stgpa = "F";
                    g1stgradePoint = 0.00;
                }
                if (score.drawing.firstSem >= 0 && score.drawing.firstSem < 33) {
                    d1stgpa = "F";
                    d1stgradePoint = 0.00;
                }

                //  SECOND SEMESTER SUBJECTS  mark 80-100
                if (score.bangla.secondSem >= 80) {
                    b2ndgpa = "A+";
                    b2ndgradePoint = 5.00;
                }
                if (score.english.secondSem >= 80) {
                    e2ndgpa = "A+";
                    e2ndgradePoint = 5.00;
                }
                if (score.math.secondSem >= 80) {
                    m2ndgpa = "A+";
                    m2ndgradePoint = 5.00;
                }
                if (score.religion.secondSem >= 80) {
                    r2ndgpa = "A+";
                    r2ndgradePoint = 5.00;
                }
                if (score.general_knowledge.secondSem >= 80) {
                    g2ndgpa = "A+";
                    g2ndgradePoint = 5.00;
                }
                if (score.drawing.secondSem >= 80) {
                    d2ndgpa = "A+";
                    d2ndgradePoint = 5.00;
                }

                // marks 70-80
                if (score.bangla.secondSem >= 70 && score.bangla.secondSem < 80) {
                    b2ndgpa = "A";
                    b2ndgradePoint = 4.00;
                }
                if (score.english.secondSem >= 70 && score.english.secondSem < 80) {
                    e2ndgpa = "A";
                    e2ndgradePoint = 4.00;
                }
                if (score.math.secondSem >= 70 && score.math.secondSem < 80) {
                    m2ndgpa = "A";
                    m2ndgradePoint = 4.00;
                }
                if (score.religion.secondSem >= 70 && score.religion.secondSem < 80) {
                    r2ndgpa = "A";
                    r2ndgradePoint = 4.00;
                }
                if (score.general_knowledge.secondSem >= 70 && score.general_knowledge.secondSem < 80) {
                    g2ndgpa = "A";
                    g2ndgradePoint = 4.00;
                }
                if (score.drawing.secondSem >= 70 && score.drawing.secondSem < 80) {
                    d2ndgpa = "A";
                    d2ndgradePoint = 4.00;
                }
                // markd 60-70
                if (score.bangla.secondSem >= 60 && score.bangla.secondSem < 70) {
                    b2ndgpa = "A-";
                    b2ndgradePoint = 3.50;
                }
                if (score.english.secondSem >= 60 && score.english.secondSem < 70) {
                    e2ndgpa = "A-";
                    e2ndgradePoint = 3.50;
                }
                if (score.math.secondSem >= 60 && score.math.secondSem < 70) {
                    m2ndgpa = "A-";
                    m2ndgradePoint = 3.50;
                }
                if (score.religion.secondSem >= 60 && score.religion.secondSem < 70) {
                    r2ndgpa = "A-";
                    r2ndgradePoint = 3.50;
                }
                if (score.general_knowledge.secondSem >= 60 && score.general_knowledge.secondSem < 70) {
                    g2ndgpa = "A-";
                    g2ndgradePoint = 3.50;
                }
                if (score.drawing.secondSem >= 60 && score.drawing.secondSem < 70) {
                    d2ndgpa = "A-";
                    d2ndgradePoint = 3.50;
                }

                // marks 50-60
                if (score.bangla.secondSem >= 50 && score.bangla.secondSem < 60) {
                    b2ndgpa = "B";
                    b2ndgradePoint = 3.00;
                }
                if (score.english.secondSem >= 50 && score.english.secondSem < 60) {
                    e2ndgpa = "B";
                    e2ndgradePoint = 3.00;
                }
                if (score.math.secondSem >= 50 && score.math.secondSem < 60) {
                    m2ndgpa = "B";
                    m2ndgradePoint = 3.00;
                }
                if (score.religion.secondSem >= 50 && score.religion.secondSem < 60) {
                    r2ndgpa = "B";
                    r2ndgradePoint = 3.00;
                }
                if (score.general_knowledge.secondSem >= 50 && score.general_knowledge.secondSem < 60) {
                    g2ndgpa = "B";
                    g2ndgradePoint = 3.00;
                }
                if (score.drawing.secondSem >= 50 && score.drawing.secondSem < 60) {
                    d2ndgpa = "B";
                    d2ndgradePoint = 3.00;
                }

                // marks 40-50
                if (score.bangla.secondSem >= 40 && score.bangla.secondSem < 50) {
                    b2ndgpa = "C";
                    b2ndgradePoint = 2.00;
                }
                if (score.english.secondSem >= 40 && score.english.secondSem < 50) {
                    e2ndgpa = "C";
                    e2ndgradePoint = 2.00;
                }
                if (score.math.secondSem >= 40 && score.math.secondSem < 50) {
                    m2ndgpa = "C";
                    m2ndgradePoint = 2.00;
                }
                if (score.religion.secondSem >= 40 && score.religion.secondSem < 50) {
                    r2ndgpa = "C";
                    r2ndgradePoint = 2.00;
                }
                if (score.general_knowledge.secondSem >= 40 && score.general_knowledge.secondSem < 50) {
                    g2ndgpa = "C";
                    g2ndgradePoint = 2.00;
                }
                if (score.drawing.secondSem >= 40 && score.drawing.secondSem < 50) {
                    d2ndgpa = "C";
                    d2ndgradePoint = 2.00;
                }

                // marks 33-40
                if (score.bangla.secondSem >= 33 && score.bangla.secondSem < 40) {
                    b2ndgpa = "D";
                    b2ndgradePoint = 1.00;
                }
                if (score.english.secondSem >= 33 && score.english.secondSem < 40) {
                    e2ndgpa = "D";
                    e2ndgradePoint = 1.00;
                }
                if (score.math.secondSem >= 33 && score.math.secondSem < 40) {
                    m2ndgpa = "D";
                    m2ndgradePoint = 1.00;
                }
                if (score.religion.secondSem >= 33 && score.religion.secondSem < 40) {
                    r2ndgpa = "D";
                    r2ndgradePoint = 1.00;
                }
                if (score.general_knowledge.secondSem >= 33 && score.general_knowledge.secondSem < 40) {
                    g2ndgpa = "D";
                    g2ndgradePoint = 1.00;
                }
                if (score.drawing.secondSem >= 33 && score.drawing.secondSem < 40) {
                    d2ndgpa = "D";
                    d2ndgradePoint = 1.00;
                }

                // MARKS 00-32
                if (score.bangla.secondSem >= 0 && score.bangla.secondSem < 33) {
                    b2ndgpa = "F";
                    b2ndgradePoint = 0.00;
                }
                if (score.english.secondSem >= 0 && score.english.secondSem < 33) {
                    e2ndgpa = "F";
                    e2ndgradePoint = 0.00;
                }
                if (score.math.secondSem >= 0 && score.math.secondSem < 33) {
                    m2ndgpa = "F";
                    m2ndgradePoint = 0.00;
                }
                if (score.religion.secondSem >= 0 && score.religion.secondSem < 33) {
                    r2ndgpa = "F";
                    r2ndgradePoint = 0.00;
                }
                if (score.general_knowledge.secondSem >= 0 && score.general_knowledge.secondSem < 33) {
                    g2ndgpa = "F";
                    g2ndgradePoint = 0.00;
                }
                if (score.drawing.secondSem >= 0 && score.drawing.secondSem < 33) {
                    d2ndgpa = "F";
                    d2ndgradePoint = 0.00;
                }

                //  THIRD SEMESTER SUBJECTS marks 80-100
                if (score.bangla.thirdSem >= 80) {
                    b3rdgpa = "A+";
                    b3rdgradePoint = 5.00;
                }
                if (score.english.thirdSem >= 80) {
                    e3rdgpa = "A+";
                    e3rdgradePoint = 5.00;
                }
                if (score.math.thirdSem >= 80) {
                    m3rdgpa = "A+";
                    m3rdgradePoint = 5.00;
                }
                if (score.religion.thirdSem >= 80) {
                    r3rdgpa = "A+";
                    r3rdgradePoint = 5.00;
                }
                if (score.general_knowledge.thirdSem >= 80) {
                    g3rdgpa = "A+";
                    g3rdgradePoint = 5.00;
                }
                if (score.drawing.thirdSem >= 80) {
                    d3rdgpa = "A+";
                    d3rdgradePoint = 5.00;
                }

                // marks 70-80
                if (score.bangla.thirdSem >= 70 && score.bangla.thirdSem < 80) {
                    b3rdgpa = "A";
                    b3rdgradePoint = 4.00;
                }
                if (score.english.thirdSem >= 70 && score.english.thirdSem < 80) {
                    e3rdgpa = "A";
                    e3rdgradePoint = 4.00;
                }
                if (score.math.thirdSem >= 70 && score.math.thirdSem < 80) {
                    m3rdgpa = "A";
                    m3rdgradePoint = 4.00;
                }
                if (score.religion.thirdSem >= 70 && score.religion.thirdSem < 80) {
                    r3rdgpa = "A";
                    r3rdgradePoint = 4.00;
                }
                if (score.general_knowledge.thirdSem >= 70 && score.general_knowledge.thirdSem < 80) {
                    g3rdgpa = "A";
                    g3rdgradePoint = 4.00;
                }
                if (score.drawing.thirdSem >= 70 && score.drawing.thirdSem < 80) {
                    d3rdgpa = "A";
                    d3rdgradePoint = 4.00;
                }
                // markd 60-70
                if (score.bangla.thirdSem >= 60 && score.bangla.thirdSem < 70) {
                    b3rdgpa = "A-";
                    b3rdgradePoint = 3.50;
                }
                if (score.english.thirdSem >= 60 && score.english.thirdSem < 70) {
                    e3rdgpa = "A-";
                    e3rdgradePoint = 3.50;
                }
                if (score.math.thirdSem >= 60 && score.math.thirdSem < 70) {
                    m3rdgpa = "A-";
                    m3rdgradePoint = 3.50;
                }
                if (score.religion.thirdSem >= 60 && score.religion.thirdSem < 70) {
                    r3rdgpa = "A-";
                    r3rdgradePoint = 3.50;
                }
                if (score.general_knowledge.thirdSem >= 60 && score.general_knowledge.thirdSem < 70) {
                    g3rdgpa = "A-";
                    g3rdgradePoint = 3.50;
                }
                if (score.drawing.thirdSem >= 60 && score.drawing.thirdSem < 70) {
                    d3rdgpa = "A-";
                    d3rdgradePoint = 3.50;
                }

                // marks 50-60
                if (score.bangla.thirdSem >= 50 && score.bangla.thirdSem < 60) {
                    b3rdgpa = "B";
                    b3rdgradePoint = 3.00;
                }
                if (score.english.thirdSem >= 50 && score.english.thirdSem < 60) {
                    e3rdgpa = "B";
                    e3rdgradePoint = 3.00;
                }
                if (score.math.thirdSem >= 50 && score.math.thirdSem < 60) {
                    m3rdgpa = "B";
                    m3rdgradePoint = 3.00;
                }
                if (score.religion.thirdSem >= 50 && score.religion.thirdSem < 60) {
                    r3rdgpa = "B";
                    r3rdgradePoint = 3.00;
                }
                if (score.general_knowledge.thirdSem >= 50 && score.general_knowledge.thirdSem < 60) {
                    g3rdgpa = "B";
                    g3rdgradePoint = 3.00;
                }
                if (score.drawing.thirdSem >= 50 && score.drawing.thirdSem < 60) {
                    d3rdgpa = "B";
                    d3rdgradePoint = 3.00;
                }

                // marks 40-50
                if (score.bangla.thirdSem >= 40 && score.bangla.thirdSem < 50) {
                    b3rdgpa = "C";
                    b3rdgradePoint = 2.00;
                }
                if (score.english.thirdSem >= 40 && score.english.thirdSem < 50) {
                    e3rdgpa = "C";
                    e3rdgradePoint = 2.00;
                }
                if (score.math.thirdSem >= 40 && score.math.thirdSem < 50) {
                    m3rdgpa = "C";
                    m3rdgradePoint = 2.00;
                }
                if (score.religion.thirdSem >= 40 && score.religion.thirdSem < 50) {
                    r3rdgpa = "C";
                    r3rdgradePoint = 2.00;
                }
                if (score.general_knowledge.thirdSem >= 40 && score.general_knowledge.thirdSem < 50) {
                    g3rdgpa = "C";
                    g3rdgradePoint = 2.00;
                }
                if (score.drawing.thirdSem >= 40 && score.drawing.thirdSem < 50) {
                    d3rdgpa = "C";
                    d3rdgradePoint = 2.00;
                }

                // marks 33-40
                if (score.bangla.thirdSem >= 33 && score.bangla.thirdSem < 40) {
                    b3rdgpa = "D";
                    b3rdgradePoint = 1.00;
                }
                if (score.english.thirdSem >= 33 && score.english.thirdSem < 40) {
                    e3rdgpa = "D";
                    e3rdgradePoint = 1.00;
                }
                if (score.math.thirdSem >= 33 && score.math.thirdSem < 40) {
                    m3rdgpa = "D";
                    m3rdgradePoint = 1.00;
                }
                if (score.religion.thirdSem >= 33 && score.religion.thirdSem < 40) {
                    r3rdgpa = "D";
                    r3rdgradePoint = 1.00;
                }
                if (score.general_knowledge.thirdSem >= 33 && score.general_knowledge.thirdSem < 40) {
                    g3rdgpa = "D";
                    g3rdgradePoint = 1.00;
                }
                if (score.drawing.thirdSem >= 33 && score.drawing.thirdSem < 40) {
                    d3rdgpa = "D";
                    d3rdgradePoint = 1.00;
                }

                // MARKS 00-32
                if (score.bangla.thirdSem >= 0 && score.bangla.thirdSem < 33) {
                    b3rdgpa = "F";
                    b3rdgradePoint = 0.00;
                }
                if (score.english.thirdSem >= 0 && score.english.thirdSem < 33) {
                    e3rdgpa = "F";
                    e3rdgradePoint = 0.00;
                }
                if (score.math.thirdSem >= 0 && score.math.thirdSem < 33) {
                    m3rdgpa = "F";
                    m3rdgradePoint = 0.00;
                }
                if (score.religion.thirdSem >= 0 && score.religion.thirdSem < 33) {
                    r3rdgpa = "F";
                    r3rdgradePoint = 0.00;
                }
                if (score.general_knowledge.thirdSem >= 0 && score.general_knowledge.thirdSem < 33) {
                    g3rdgpa = "F";
                    g3rdgradePoint = 0.00;
                }
                if (score.drawing.thirdSem >= 0 && score.drawing.thirdSem < 33) {
                    d3rdgpa = "F";
                    d3rdgradePoint = 0.00;
                }

                //ANUAL GRADE POINTS
                if (b3rdgradePoint == 0 || e3rdgradePoint == 0 || m3rdgradePoint == 0 || r3rdgradePoint == 0 || d3rdgradePoint == 0 || g3rdgradePoint == 0) {
                    thirdSemTotalGrade = 0;
                } else {
                    thirdSemTotalGrade = (((b3rdgradePoint + e3rdgradePoint + m3rdgradePoint + r3rdgradePoint + d3rdgradePoint + g3rdgradePoint) - 2) / 5);
                    if (thirdSemTotalGrade > 5) {
                        thirdSemTotalGrade = 5;
                    }
                }
                if (b2ndgradePoint == 0 || e2ndgradePoint == 0 || m2ndgradePoint == 0 || r2ndgradePoint == 0 || d2ndgradePoint == 0 || g2ndgradePoint == 0) {
                    secondSemTotalGrade = 0;
                } else {
                    secondSemTotalGrade = ((b2ndgradePoint + e2ndgradePoint + m2ndgradePoint + r2ndgradePoint + d2ndgradePoint + g2ndgradePoint) - 2) / 5;
                    if (secondSemTotalGrade > 5) {
                        secondSemTotalGrade = 5;
                    }
                }
                if (b1stgradePoint === 0 || e1stgradePoint === 0 || m1stgradePoint === 0 || r1stgradePoint === 0 || d1stgradePoint === 0 || g1stgradePoint === 0) {
                    firstSemTotalGrade = 0;
                } else {
                    firstSemTotalGrade = ((b1stgradePoint + e1stgradePoint + m1stgradePoint + r1stgradePoint + d1stgradePoint + g1stgradePoint) - 2) / 5;
                    if (firstSemTotalGrade > 5) {
                        firstSemTotalGrade = 5;
                    }
                }
                if (firstSemTotalGrade == 0 || secondSemTotalGrade == 0 || thirdSemTotalGrade == 0) {
                    overAllTotalGrade = 0;
                } else {
                    overAllTotalGrade = ((firstSemTotalGrade + secondSemTotalGrade + thirdSemTotalGrade) / 3).toPrecision(3);
                }

                // SEMESTER TOTAL GRADE CALCULATION
                if (firstSemTotalGrade == 5) {
                    firstSemGrade = "A+";
                }
                if (firstSemTotalGrade >= 4 && firstSemTotalGrade < 5) {
                    firstSemGrade = "A";
                }
                if (firstSemTotalGrade >= 3 && firstSemTotalGrade < 4) {
                    firstSemGrade = "A-";
                }
                if (firstSemTotalGrade >= 2 && firstSemTotalGrade < 3) {
                    firstSemGrade = "B";
                }
                if (firstSemTotalGrade >= 1 && firstSemTotalGrade < 2) {
                    firstSemGrade = "C";
                }
                if (firstSemTotalGrade >= 0 && firstSemTotalGrade < 1) {
                    firstSemGrade = "D";
                }
                if (firstSemTotalGrade == 0) {
                    firstSemGrade = "F";
                }
                if (secondSemTotalGrade == 5) {
                    secondSemGrade = "A+";
                }
                if (secondSemTotalGrade >= 4 && secondSemTotalGrade < 5) {
                    secondSemGrade = "A";
                }
                if (secondSemTotalGrade >= 3 && secondSemTotalGrade < 4) {
                    secondSemGrade = "A-";
                }
                if (secondSemTotalGrade >= 2 && secondSemTotalGrade < 3) {
                    secondSemGrade = "B";
                }
                if (secondSemTotalGrade >= 1 && secondSemTotalGrade < 2) {
                    secondSemGrade = "C";
                }
                if (secondSemTotalGrade >= 0 && secondSemTotalGrade < 1) {
                    secondSemGrade = "D";
                }
                if (secondSemTotalGrade == 0) {
                    secondSemGrade = "F";
                }
                if (thirdSemTotalGrade == 5) {
                    thirdSemGrade = "A+";
                }
                if (thirdSemTotalGrade >= 4 && thirdSemTotalGrade < 5) {
                    thirdSemGrade = "A";
                }
                if (thirdSemTotalGrade >= 3 && thirdSemTotalGrade < 4) {
                    thirdSemGrade = "A-";
                }
                if (thirdSemTotalGrade >= 2 && thirdSemTotalGrade < 3) {
                    thirdSemGrade = "B";
                }
                if (thirdSemTotalGrade >= 1 && thirdSemTotalGrade < 2) {
                    thirdSemGrade = "C";
                }
                if (thirdSemTotalGrade >= 0 && thirdSemTotalGrade < 1) {
                    thirdSemGrade = "D";
                }
                if (thirdSemTotalGrade == 0) {
                    thirdSemGrade = "F";
                }

                // OVERALL TOTAL GRADE CALCULATION
                if (overAllTotalGrade == 5) {
                    overAllGrade = "A+";
                }
                if (overAllTotalGrade >= 4 && overAllTotalGrade < 5) {
                    overAllGrade = "A";
                }
                if (overAllTotalGrade >= 3 && overAllTotalGrade < 4) {
                    overAllGrade = "A-";
                }
                if (overAllTotalGrade >= 2 && overAllTotalGrade < 3) {
                    overAllGrade = "B";
                }
                if (overAllTotalGrade >= 1 && overAllTotalGrade < 2) {
                    overAllGrade = "C";
                }
                if (overAllTotalGrade >= 0 && overAllTotalGrade < 1) {
                    overAllGrade = "D";
                }
                if (overAllTotalGrade == 0) {
                    overAllGrade = "F";
                }

                score.save();
                req.flash("success_msg", "Result entry is done");

                res.render("nurseryResult", {
                    totalFirstSem,
                    totalSecondSem,
                    totalThirdSem,
                    average,
                    secondSemAverage,
                    thirdSemAverage,
                    score,
                    student,
                    b1stgpa,
                    b2ndgpa,
                    b3rdgpa,
                    e1stgpa,
                    e2ndgpa,
                    e3rdgpa,
                    m1stgpa,
                    m2ndgpa,
                    m3rdgpa,
                    r1stgpa,
                    r2ndgpa,
                    r3rdgpa,
                    g1stgpa,
                    g2ndgpa,
                    g3rdgpa,
                    d1stgpa,
                    d2ndgpa,
                    d3rdgpa,
                    b1stgradePoint,
                    b2ndgradePoint,
                    b3rdgradePoint,
                    e1stgradePoint,
                    e2ndgradePoint,
                    e3rdgradePoint,
                    m1stgradePoint,
                    m2ndgradePoint,
                    m3rdgradePoint,
                    r1stgradePoint,
                    r2ndgradePoint,
                    r3rdgradePoint,
                    g1stgradePoint,
                    g2ndgradePoint,
                    g3rdgradePoint,
                    d1stgradePoint,
                    d2ndgradePoint,
                    d3rdgradePoint,
                    firstSemTotalGrade,
                    secondSemTotalGrade,
                    thirdSemTotalGrade,
                    firstSemGrade,
                    secondSemGrade,
                    thirdSemGrade,
                    overAllTotalGrade,
                    overAllGrade,
                    totalAverageMarks,
                    studentRole: student.role
                });

            }
            // if(!student && !score){     req.flash("error_msg","ID is not found");
            // res.redirect("registration"); }
            if (!student && !score) {
                req.flash("error_msg", " ID IS NOT FOUND ! ");
                res.redirect("registration");
            }
        });
    });

});

router.post("/result", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    const studentRole = req.user.role;
    studentDB.findOne({
        students_id: id
    }, (err, student) => {
        nurserySub.findOne({
            students_id: id
        }, (err, score) => {
            if (student) {
                if (student.Class === "Nursery" || student.Class === "Play" || student.Class === "1" || student.Class === "2" || student.Class === "3") {
                    if (student && score) {
                        var b1stgpa,
                            b2ndgpa,
                            b3rdgpa,
                            e1stgpa,
                            e2ndgpa,
                            e3rdgpa,
                            m1stgpa,
                            m2ndgpa,
                            m3rdgpa,
                            r1stgpa,
                            r2ndgpa,
                            r3rdgpa,
                            g1stgpa,
                            g2ndgpa,
                            g3rdgpa,
                            d1stgpa,
                            d2ndgpa,
                            d3rdgpa,
                            b1stgradePoint,
                            b2ndgradePoint,
                            b3rdgradePoint,
                            e1stgradePoint,
                            e2ndgradePoint,
                            e3rdgradePoint,
                            m1stgradePoint,
                            m2ndgradePoint,
                            m3rdgradePoint,
                            r1stgradePoint,
                            r2ndgradePoint,
                            r3rdgradePoint,
                            g1stgradePoint,
                            g2ndgradePoint,
                            g3rdgradePoint,
                            d1stgradePoint,
                            d2ndgradePoint,
                            d3rdgradePoint,
                            firstSemGrade,
                            secondSemGrade,
                            thirdSemGrade,
                            overAllGrade,
                            overAllTotalGrade,
                            totalAverageMarks;

                        var totalThirdSem,
                            thirdSemAverage,
                            tnumber;
                        totalThirdSem = score.bangla.thirdSem + score.english.thirdSem + score.math.thirdSem + score.religion.thirdSem + score.general_knowledge.thirdSem + score.drawing.thirdSem;
                        tnumber = totalThirdSem / 6;
                        thirdSemAverage = tnumber.toPrecision(4);

                        var totalFirstSem,
                            average,
                            fnumber;
                        totalFirstSem = score.bangla.firstSem + score.english.firstSem + score.math.firstSem + score.religion.firstSem + score.general_knowledge.firstSem + score.drawing.firstSem;
                        fnumber = totalFirstSem / 6;
                        average = fnumber.toPrecision(4);

                        var totalSecondSem,
                            secondSemAverage,
                            Snumber;
                        totalSecondSem = score.bangla.secondSem + score.english.secondSem + score.math.secondSem + score.religion.secondSem + score.general_knowledge.secondSem + score.drawing.secondSem;
                        Snumber = totalSecondSem / 6;
                        secondSemAverage = Snumber.toPrecision(4);

                        // For total average marks calculation
                        totalAverageMarks = ((fnumber + Snumber + tnumber) / 3).toPrecision(4);

                        //  Grading detection and showing the grade point  FIRST SEMESTER SUBJECTS'
                        // marks 80-100
                        if (score.bangla.firstSem >= 80) {
                            b1stgpa = "A+";
                            b1stgradePoint = 5.00;
                        }
                        if (score.english.firstSem >= 80) {
                            e1stgpa = "A+";
                            e1stgradePoint = 5.00;
                        }
                        if (score.math.firstSem >= 80) {
                            m1stgpa = "A+";
                            m1stgradePoint = 5.00;
                        }
                        if (score.religion.firstSem >= 80) {
                            r1stgpa = "A+";
                            r1stgradePoint = 5.00;
                        }
                        if (score.general_knowledge.firstSem >= 80) {
                            g1stgpa = "A+";
                            g1stgradePoint = 5.00;
                        }
                        if (score.drawing.firstSem >= 80) {
                            d1stgpa = "A+";
                            d1stgradePoint = 5.00;
                        }

                        // marks 70-80
                        if (score.bangla.firstSem >= 70 && score.bangla.firstSem < 80) {
                            b1stgpa = "A";
                            b1stgradePoint = 4.00;
                        }
                        if (score.english.firstSem >= 70 && score.english.firstSem < 80) {
                            e1stgpa = "A";
                            e1stgradePoint = 4.00;
                        }
                        if (score.math.firstSem >= 70 && score.math.firstSem < 80) {
                            m1stgpa = "A";
                            m1stgradePoint = 4.00;
                        }
                        if (score.religion.firstSem >= 70 && score.religion.firstSem < 80) {
                            r1stgpa = "A";
                            r1stgradePoint = 4.00;
                        }
                        if (score.general_knowledge.firstSem >= 70 && score.general_knowledge.firstSem < 80) {
                            g1stgpa = "A";
                            g1stgradePoint = 4.00;
                        }
                        if (score.drawing.firstSem >= 70 && score.drawing.firstSem < 80) {
                            d1stgpa = "A";
                            d1stgradePoint = 4.00;
                        }
                        // markd 60-70
                        if (score.bangla.firstSem >= 60 && score.bangla.firstSem < 70) {
                            b1stgpa = "A-";
                            b1stgradePoint = 3.50;
                        }
                        if (score.english.firstSem >= 60 && score.english.firstSem < 70) {
                            e1stgpa = "A-";
                            e1stgradePoint = 3.50;
                        }
                        if (score.math.firstSem >= 60 && score.math.firstSem < 70) {
                            m1stgpa = "A-";
                            m1stgradePoint = 3.50;
                        }
                        if (score.religion.firstSem >= 60 && score.religion.firstSem < 70) {
                            r1stgpa = "A-";
                            r1stgradePoint = 3.50;
                        }
                        if (score.general_knowledge.firstSem >= 60 && score.general_knowledge.firstSem < 70) {
                            g1stgpa = "A-";
                            g1stgradePoint = 3.50;
                        }
                        if (score.drawing.firstSem >= 60 && score.drawing.firstSem < 70) {
                            d1stgpa = "A-";
                            d1stgradePoint = 3.50;
                        }

                        // marks 50-60
                        if (score.bangla.firstSem >= 50 && score.bangla.firstSem < 60) {
                            b1stgpa = "B";
                            b1stgradePoint = 3.00;
                        }
                        if (score.english.firstSem >= 50 && score.english.firstSem < 60) {
                            e1stgpa = "B";
                            e1stgradePoint = 3.00;
                        }
                        if (score.math.firstSem >= 50 && score.math.firstSem < 60) {
                            m1stgpa = "B";
                            m1stgradePoint = 3.00;
                        }
                        if (score.religion.firstSem >= 50 && score.religion.firstSem < 60) {
                            r1stgpa = "B";
                            r1stgradePoint = 3.00;
                        }
                        if (score.general_knowledge.firstSem >= 50 && score.general_knowledge.firstSem < 60) {
                            g1stgpa = "B";
                            g1stgradePoint = 3.00;
                        }
                        if (score.drawing.firstSem >= 50 && score.drawing.firstSem < 60) {
                            d1stgpa = "B";
                            d1stgradePoint = 3.00;
                        }

                        // marks 40-50
                        if (score.bangla.firstSem >= 40 && score.bangla.firstSem < 50) {
                            b1stgpa = "C";
                            b1stgradePoint = 2.00;
                        }
                        if (score.english.firstSem >= 40 && score.english.firstSem < 50) {
                            e1stgpa = "C";
                            e1stgradePoint = 2.00;
                        }
                        if (score.math.firstSem >= 40 && score.math.firstSem < 50) {
                            m1stgpa = "C";
                            m1stgradePoint = 2.00;
                        }
                        if (score.religion.firstSem >= 40 && score.religion.firstSem < 50) {
                            r1stgpa = "C";
                            r1stgradePoint = 2.00;
                        }
                        if (score.general_knowledge.firstSem >= 40 && score.general_knowledge.firstSem < 50) {
                            g1stgpa = "C";
                            g1stgradePoint = 2.00;
                        }
                        if (score.drawing.firstSem >= 40 && score.drawing.firstSem < 50) {
                            d1stgpa = "C";
                            d1stgradePoint = 2.00;
                        }

                        // marks 33-40
                        if (score.bangla.firstSem >= 33 && score.bangla.firstSem < 40) {
                            b1stgpa = "D";
                            b1stgradePoint = 1.00;
                        }
                        if (score.english.firstSem >= 33 && score.english.firstSem < 40) {
                            e1stgpa = "D";
                            e1stgradePoint = 1.00;
                        }
                        if (score.math.firstSem >= 33 && score.math.firstSem < 40) {
                            m1stgpa = "D";
                            m1stgradePoint = 1.00;
                        }
                        if (score.religion.firstSem >= 33 && score.religion.firstSem < 40) {
                            r1stgpa = "D";
                            r1stgradePoint = 1.00;
                        }
                        if (score.general_knowledge.firstSem >= 33 && score.general_knowledge.firstSem < 40) {
                            g1stgpa = "D";
                            g1stgradePoint = 1.00;
                        }
                        if (score.drawing.firstSem >= 33 && score.drawing.firstSem < 40) {
                            d1stgpa = "D";
                            d1stgradePoint = 1.00;
                        }

                        // marks 00-32
                        if (score.bangla.firstSem >= 0 && score.bangla.firstSem < 33) {
                            b1stgpa = "F";
                            b1stgradePoint = 0.00;
                        }
                        if (score.english.firstSem >= 0 && score.english.firstSem < 33) {
                            e1stgpa = "F";
                            e1stgradePoint = 0.00;
                        }
                        if (score.math.firstSem >= 0 && score.math.firstSem < 33) {
                            m1stgpa = "F";
                            m1stgradePoint = 0.00;
                        }
                        if (score.religion.firstSem >= 0 && score.religion.firstSem < 33) {
                            r1stgpa = "F";
                            r1stgradePoint = 0.00;
                        }
                        if (score.general_knowledge.firstSem >= 0 && score.general_knowledge.firstSem < 33) {
                            g1stgpa = "F";
                            g1stgradePoint = 0.00;
                        }
                        if (score.drawing.firstSem >= 0 && score.drawing.firstSem < 33) {
                            d1stgpa = "F";
                            d1stgradePoint = 0.00;
                        }

                        //  SECOND SEMESTER SUBJECTS  mark 80-100
                        if (score.bangla.secondSem >= 80) {
                            b2ndgpa = "A+";
                            b2ndgradePoint = 5.00;
                        }
                        if (score.english.secondSem >= 80) {
                            e2ndgpa = "A+";
                            e2ndgradePoint = 5.00;
                        }
                        if (score.math.secondSem >= 80) {
                            m2ndgpa = "A+";
                            m2ndgradePoint = 5.00;
                        }
                        if (score.religion.secondSem >= 80) {
                            r2ndgpa = "A+";
                            r2ndgradePoint = 5.00;
                        }
                        if (score.general_knowledge.secondSem >= 80) {
                            g2ndgpa = "A+";
                            g2ndgradePoint = 5.00;
                        }
                        if (score.drawing.secondSem >= 80) {
                            d2ndgpa = "A+";
                            d2ndgradePoint = 5.00;
                        }

                        // marks 70-80
                        if (score.bangla.secondSem >= 70 && score.bangla.secondSem < 80) {
                            b2ndgpa = "A";
                            b2ndgradePoint = 4.00;
                        }
                        if (score.english.secondSem >= 70 && score.english.secondSem < 80) {
                            e2ndgpa = "A";
                            e2ndgradePoint = 4.00;
                        }
                        if (score.math.secondSem >= 70 && score.math.secondSem < 80) {
                            m2ndgpa = "A";
                            m2ndgradePoint = 4.00;
                        }
                        if (score.religion.secondSem >= 70 && score.religion.secondSem < 80) {
                            r2ndgpa = "A";
                            r2ndgradePoint = 4.00;
                        }
                        if (score.general_knowledge.secondSem >= 70 && score.general_knowledge.secondSem < 80) {
                            g2ndgpa = "A";
                            g2ndgradePoint = 4.00;
                        }
                        if (score.drawing.secondSem >= 70 && score.drawing.secondSem < 80) {
                            d2ndgpa = "A";
                            d2ndgradePoint = 4.00;
                        }
                        // markd 60-70
                        if (score.bangla.secondSem >= 60 && score.bangla.secondSem < 70) {
                            b2ndgpa = "A-";
                            b2ndgradePoint = 3.50;
                        }
                        if (score.english.secondSem >= 60 && score.english.secondSem < 70) {
                            e2ndgpa = "A-";
                            e2ndgradePoint = 3.50;
                        }
                        if (score.math.secondSem >= 60 && score.math.secondSem < 70) {
                            m2ndgpa = "A-";
                            m2ndgradePoint = 3.50;
                        }
                        if (score.religion.secondSem >= 60 && score.religion.secondSem < 70) {
                            r2ndgpa = "A-";
                            r2ndgradePoint = 3.50;
                        }
                        if (score.general_knowledge.secondSem >= 60 && score.general_knowledge.secondSem < 70) {
                            g2ndgpa = "A-";
                            g2ndgradePoint = 3.50;
                        }
                        if (score.drawing.secondSem >= 60 && score.drawing.secondSem < 70) {
                            d2ndgpa = "A-";
                            d2ndgradePoint = 3.50;
                        }

                        // marks 50-60
                        if (score.bangla.secondSem >= 50 && score.bangla.secondSem < 60) {
                            b2ndgpa = "B";
                            b2ndgradePoint = 3.00;
                        }
                        if (score.english.secondSem >= 50 && score.english.secondSem < 60) {
                            e2ndgpa = "B";
                            e2ndgradePoint = 3.00;
                        }
                        if (score.math.secondSem >= 50 && score.math.secondSem < 60) {
                            m2ndgpa = "B";
                            m2ndgradePoint = 3.00;
                        }
                        if (score.religion.secondSem >= 50 && score.religion.secondSem < 60) {
                            r2ndgpa = "B";
                            r2ndgradePoint = 3.00;
                        }
                        if (score.general_knowledge.secondSem >= 50 && score.general_knowledge.secondSem < 60) {
                            g2ndgpa = "B";
                            g2ndgradePoint = 3.00;
                        }
                        if (score.drawing.secondSem >= 50 && score.drawing.secondSem < 60) {
                            d2ndgpa = "B";
                            d2ndgradePoint = 3.00;
                        }

                        // marks 40-50
                        if (score.bangla.secondSem >= 40 && score.bangla.secondSem < 50) {
                            b2ndgpa = "C";
                            b2ndgradePoint = 2.00;
                        }
                        if (score.english.secondSem >= 40 && score.english.secondSem < 50) {
                            e2ndgpa = "C";
                            e2ndgradePoint = 2.00;
                        }
                        if (score.math.secondSem >= 40 && score.math.secondSem < 50) {
                            m2ndgpa = "C";
                            m2ndgradePoint = 2.00;
                        }
                        if (score.religion.secondSem >= 40 && score.religion.secondSem < 50) {
                            r2ndgpa = "C";
                            r2ndgradePoint = 2.00;
                        }
                        if (score.general_knowledge.secondSem >= 40 && score.general_knowledge.secondSem < 50) {
                            g2ndgpa = "C";
                            g2ndgradePoint = 2.00;
                        }
                        if (score.drawing.secondSem >= 40 && score.drawing.secondSem < 50) {
                            d2ndgpa = "C";
                            d2ndgradePoint = 2.00;
                        }

                        // marks 33-40
                        if (score.bangla.secondSem >= 33 && score.bangla.secondSem < 40) {
                            b2ndgpa = "D";
                            b2ndgradePoint = 1.00;
                        }
                        if (score.english.secondSem >= 33 && score.english.secondSem < 40) {
                            e2ndgpa = "D";
                            e2ndgradePoint = 1.00;
                        }
                        if (score.math.secondSem >= 33 && score.math.secondSem < 40) {
                            m2ndgpa = "D";
                            m2ndgradePoint = 1.00;
                        }
                        if (score.religion.secondSem >= 33 && score.religion.secondSem < 40) {
                            r2ndgpa = "D";
                            r2ndgradePoint = 1.00;
                        }
                        if (score.general_knowledge.secondSem >= 33 && score.general_knowledge.secondSem < 40) {
                            g2ndgpa = "D";
                            g2ndgradePoint = 1.00;
                        }
                        if (score.drawing.secondSem >= 33 && score.drawing.secondSem < 40) {
                            d2ndgpa = "D";
                            d2ndgradePoint = 1.00;
                        }

                        // MARKS 00-32
                        if (score.bangla.secondSem >= 0 && score.bangla.secondSem < 33) {
                            b2ndgpa = "F";
                            b2ndgradePoint = 0.00;
                        }
                        if (score.english.secondSem >= 0 && score.english.secondSem < 33) {
                            e2ndgpa = "F";
                            e2ndgradePoint = 0.00;
                        }
                        if (score.math.secondSem >= 0 && score.math.secondSem < 33) {
                            m2ndgpa = "F";
                            m2ndgradePoint = 0.00;
                        }
                        if (score.religion.secondSem >= 0 && score.religion.secondSem < 33) {
                            r2ndgpa = "F";
                            r2ndgradePoint = 0.00;
                        }
                        if (score.general_knowledge.secondSem >= 0 && score.general_knowledge.secondSem < 33) {
                            g2ndgpa = "F";
                            g2ndgradePoint = 0.00;
                        }
                        if (score.drawing.secondSem >= 0 && score.drawing.secondSem < 33) {
                            d2ndgpa = "F";
                            d2ndgradePoint = 0.00;
                        }

                        //  THIRD SEMESTER SUBJECTS marks 80-100
                        if (score.bangla.thirdSem >= 80) {
                            b3rdgpa = "A+";
                            b3rdgradePoint = 5.00;
                        }
                        if (score.english.thirdSem >= 80) {
                            e3rdgpa = "A+";
                            e3rdgradePoint = 5.00;
                        }
                        if (score.math.thirdSem >= 80) {
                            m3rdgpa = "A+";
                            m3rdgradePoint = 5.00;
                        }
                        if (score.religion.thirdSem >= 80) {
                            r3rdgpa = "A+";
                            r3rdgradePoint = 5.00;
                        }
                        if (score.general_knowledge.thirdSem >= 80) {
                            g3rdgpa = "A+";
                            g3rdgradePoint = 5.00;
                        }
                        if (score.drawing.thirdSem >= 80) {
                            d3rdgpa = "A+";
                            d3rdgradePoint = 5.00;
                        }

                        // marks 70-80
                        if (score.bangla.thirdSem >= 70 && score.bangla.thirdSem < 80) {
                            b3rdgpa = "A";
                            b3rdgradePoint = 4.00;
                        }
                        if (score.english.thirdSem >= 70 && score.english.thirdSem < 80) {
                            e3rdgpa = "A";
                            e3rdgradePoint = 4.00;
                        }
                        if (score.math.thirdSem >= 70 && score.math.thirdSem < 80) {
                            m3rdgpa = "A";
                            m3rdgradePoint = 4.00;
                        }
                        if (score.religion.thirdSem >= 70 && score.religion.thirdSem < 80) {
                            r3rdgpa = "A";
                            r3rdgradePoint = 4.00;
                        }
                        if (score.general_knowledge.thirdSem >= 70 && score.general_knowledge.thirdSem < 80) {
                            g3rdgpa = "A";
                            g3rdgradePoint = 4.00;
                        }
                        if (score.drawing.thirdSem >= 70 && score.drawing.thirdSem < 80) {
                            d3rdgpa = "A";
                            d3rdgradePoint = 4.00;
                        }
                        // markd 60-70
                        if (score.bangla.thirdSem >= 60 && score.bangla.thirdSem < 70) {
                            b3rdgpa = "A-";
                            b3rdgradePoint = 3.50;
                        }
                        if (score.english.thirdSem >= 60 && score.english.thirdSem < 70) {
                            e3rdgpa = "A-";
                            e3rdgradePoint = 3.50;
                        }
                        if (score.math.thirdSem >= 60 && score.math.thirdSem < 70) {
                            m3rdgpa = "A-";
                            m3rdgradePoint = 3.50;
                        }
                        if (score.religion.thirdSem >= 60 && score.religion.thirdSem < 70) {
                            r3rdgpa = "A-";
                            r3rdgradePoint = 3.50;
                        }
                        if (score.general_knowledge.thirdSem >= 60 && score.general_knowledge.thirdSem < 70) {
                            g3rdgpa = "A-";
                            g3rdgradePoint = 3.50;
                        }
                        if (score.drawing.thirdSem >= 60 && score.drawing.thirdSem < 70) {
                            d3rdgpa = "A-";
                            d3rdgradePoint = 3.50;
                        }

                        // marks 50-60
                        if (score.bangla.thirdSem >= 50 && score.bangla.thirdSem < 60) {
                            b3rdgpa = "B";
                            b3rdgradePoint = 3.00;
                        }
                        if (score.english.thirdSem >= 50 && score.english.thirdSem < 60) {
                            e3rdgpa = "B";
                            e3rdgradePoint = 3.00;
                        }
                        if (score.math.thirdSem >= 50 && score.math.thirdSem < 60) {
                            m3rdgpa = "B";
                            m3rdgradePoint = 3.00;
                        }
                        if (score.religion.thirdSem >= 50 && score.religion.thirdSem < 60) {
                            r3rdgpa = "B";
                            r3rdgradePoint = 3.00;
                        }
                        if (score.general_knowledge.thirdSem >= 50 && score.general_knowledge.thirdSem < 60) {
                            g3rdgpa = "B";
                            g3rdgradePoint = 3.00;
                        }
                        if (score.drawing.thirdSem >= 50 && score.drawing.thirdSem < 60) {
                            d3rdgpa = "B";
                            d3rdgradePoint = 3.00;
                        }

                        // marks 40-50
                        if (score.bangla.thirdSem >= 40 && score.bangla.thirdSem < 50) {
                            b3rdgpa = "C";
                            b3rdgradePoint = 2.00;
                        }
                        if (score.english.thirdSem >= 40 && score.english.thirdSem < 50) {
                            e3rdgpa = "C";
                            e3rdgradePoint = 2.00;
                        }
                        if (score.math.thirdSem >= 40 && score.math.thirdSem < 50) {
                            m3rdgpa = "C";
                            m3rdgradePoint = 2.00;
                        }
                        if (score.religion.thirdSem >= 40 && score.religion.thirdSem < 50) {
                            r3rdgpa = "C";
                            r3rdgradePoint = 2.00;
                        }
                        if (score.general_knowledge.thirdSem >= 40 && score.general_knowledge.thirdSem < 50) {
                            g3rdgpa = "C";
                            g3rdgradePoint = 2.00;
                        }
                        if (score.drawing.thirdSem >= 40 && score.drawing.thirdSem < 50) {
                            d3rdgpa = "C";
                            d3rdgradePoint = 2.00;
                        }

                        // marks 33-40
                        if (score.bangla.thirdSem >= 33 && score.bangla.thirdSem < 40) {
                            b3rdgpa = "D";
                            b3rdgradePoint = 1.00;
                        }
                        if (score.english.thirdSem >= 33 && score.english.thirdSem < 40) {
                            e3rdgpa = "D";
                            e3rdgradePoint = 1.00;
                        }
                        if (score.math.thirdSem >= 33 && score.math.thirdSem < 40) {
                            m3rdgpa = "D";
                            m3rdgradePoint = 1.00;
                        }
                        if (score.religion.thirdSem >= 33 && score.religion.thirdSem < 40) {
                            r3rdgpa = "D";
                            r3rdgradePoint = 1.00;
                        }
                        if (score.general_knowledge.thirdSem >= 33 && score.general_knowledge.thirdSem < 40) {
                            g3rdgpa = "D";
                            g3rdgradePoint = 1.00;
                        }
                        if (score.drawing.thirdSem >= 33 && score.drawing.thirdSem < 40) {
                            d3rdgpa = "D";
                            d3rdgradePoint = 1.00;
                        }

                        // MARKS 00-32
                        if (score.bangla.thirdSem >= 0 && score.bangla.thirdSem < 33) {
                            b3rdgpa = "F";
                            b3rdgradePoint = 0.00;
                        }
                        if (score.english.thirdSem >= 0 && score.english.thirdSem < 33) {
                            e3rdgpa = "F";
                            e3rdgradePoint = 0.00;
                        }
                        if (score.math.thirdSem >= 0 && score.math.thirdSem < 33) {
                            m3rdgpa = "F";
                            m3rdgradePoint = 0.00;
                        }
                        if (score.religion.thirdSem >= 0 && score.religion.thirdSem < 33) {
                            r3rdgpa = "F";
                            r3rdgradePoint = 0.00;
                        }
                        if (score.general_knowledge.thirdSem >= 0 && score.general_knowledge.thirdSem < 33) {
                            g3rdgpa = "F";
                            g3rdgradePoint = 0.00;
                        }
                        if (score.drawing.thirdSem >= 0 && score.drawing.thirdSem < 33) {
                            d3rdgpa = "F";
                            d3rdgradePoint = 0.00;
                        }

                        //ANUAL GRADE POINTS
                        if (b3rdgradePoint == 0 || e3rdgradePoint == 0 || m3rdgradePoint == 0 || r3rdgradePoint == 0 || d3rdgradePoint == 0 || g3rdgradePoint == 0) {
                            thirdSemTotalGrade = 0;
                        } else {
                            thirdSemTotalGrade = (((b3rdgradePoint + e3rdgradePoint + m3rdgradePoint + r3rdgradePoint + d3rdgradePoint + g3rdgradePoint) - 2) / 5);
                            if (thirdSemTotalGrade > 5) {
                                thirdSemTotalGrade = 5;
                            }
                        }
                        if (b2ndgradePoint == 0 || e2ndgradePoint == 0 || m2ndgradePoint == 0 || r2ndgradePoint == 0 || d2ndgradePoint == 0 || g2ndgradePoint == 0) {
                            secondSemTotalGrade = 0;
                        } else {
                            secondSemTotalGrade = ((b2ndgradePoint + e2ndgradePoint + m2ndgradePoint + r2ndgradePoint + d2ndgradePoint + g2ndgradePoint) - 2) / 5;
                            if (secondSemTotalGrade > 5) {
                                secondSemTotalGrade = 5;
                            }
                        }
                        if (b1stgradePoint === 0 || e1stgradePoint === 0 || m1stgradePoint === 0 || r1stgradePoint === 0 || d1stgradePoint === 0 || g1stgradePoint === 0) {
                            firstSemTotalGrade = 0;
                        } else {
                            firstSemTotalGrade = ((b1stgradePoint + e1stgradePoint + m1stgradePoint + r1stgradePoint + d1stgradePoint + g1stgradePoint) - 2) / 5;
                            if (firstSemTotalGrade > 5) {
                                firstSemTotalGrade = 5;
                            }
                        }
                        if (firstSemTotalGrade == 0 || secondSemTotalGrade == 0 || thirdSemTotalGrade == 0) {
                            overAllTotalGrade = 0;
                        } else {
                            overAllTotalGrade = ((firstSemTotalGrade + secondSemTotalGrade + thirdSemTotalGrade) / 3).toPrecision(3);
                        }

                        // SEMESTER TOTAL GRADE CALCULATION
                        if (firstSemTotalGrade == 5) {
                            firstSemGrade = "A+";
                        }
                        if (firstSemTotalGrade >= 4 && firstSemTotalGrade < 5) {
                            firstSemGrade = "A";
                        }
                        if (firstSemTotalGrade >= 3 && firstSemTotalGrade < 4) {
                            firstSemGrade = "A-";
                        }
                        if (firstSemTotalGrade >= 2 && firstSemTotalGrade < 3) {
                            firstSemGrade = "B";
                        }
                        if (firstSemTotalGrade >= 1 && firstSemTotalGrade < 2) {
                            firstSemGrade = "C";
                        }
                        if (firstSemTotalGrade >= 0 && firstSemTotalGrade < 1) {
                            firstSemGrade = "D";
                        }
                        if (firstSemTotalGrade == 0) {
                            firstSemGrade = "F";
                        }
                        if (secondSemTotalGrade == 5) {
                            secondSemGrade = "A+";
                        }
                        if (secondSemTotalGrade >= 4 && secondSemTotalGrade < 5) {
                            secondSemGrade = "A";
                        }
                        if (secondSemTotalGrade >= 3 && secondSemTotalGrade < 4) {
                            secondSemGrade = "A-";
                        }
                        if (secondSemTotalGrade >= 2 && secondSemTotalGrade < 3) {
                            secondSemGrade = "B";
                        }
                        if (secondSemTotalGrade >= 1 && secondSemTotalGrade < 2) {
                            secondSemGrade = "C";
                        }
                        if (secondSemTotalGrade >= 0 && secondSemTotalGrade < 1) {
                            secondSemGrade = "D";
                        }
                        if (secondSemTotalGrade == 0) {
                            secondSemGrade = "F";
                        }
                        if (thirdSemTotalGrade == 5) {
                            thirdSemGrade = "A+";
                        }
                        if (thirdSemTotalGrade >= 4 && thirdSemTotalGrade < 5) {
                            thirdSemGrade = "A";
                        }
                        if (thirdSemTotalGrade >= 3 && thirdSemTotalGrade < 4) {
                            thirdSemGrade = "A-";
                        }
                        if (thirdSemTotalGrade >= 2 && thirdSemTotalGrade < 3) {
                            thirdSemGrade = "B";
                        }
                        if (thirdSemTotalGrade >= 1 && thirdSemTotalGrade < 2) {
                            thirdSemGrade = "C";
                        }
                        if (thirdSemTotalGrade >= 0 && thirdSemTotalGrade < 1) {
                            thirdSemGrade = "D";
                        }
                        if (thirdSemTotalGrade == 0) {
                            thirdSemGrade = "F";
                        }

                        // OVERALL TOTAL GRADE CALCULATION
                        if (overAllTotalGrade == 5) {
                            overAllGrade = "A+";
                        }
                        if (overAllTotalGrade >= 4 && overAllTotalGrade < 5) {
                            overAllGrade = "A";
                        }
                        if (overAllTotalGrade >= 3 && overAllTotalGrade < 4) {
                            overAllGrade = "A-";
                        }
                        if (overAllTotalGrade >= 2 && overAllTotalGrade < 3) {
                            overAllGrade = "B";
                        }
                        if (overAllTotalGrade >= 1 && overAllTotalGrade < 2) {
                            overAllGrade = "C";
                        }
                        if (overAllTotalGrade >= 0 && overAllTotalGrade < 1) {
                            overAllGrade = "D";
                        }
                        if (overAllTotalGrade == 0) {
                            overAllGrade = "F";
                        }
                        console.log(student.role);
                        res.render("nurseryResult", {
                            totalFirstSem,
                            totalSecondSem,
                            totalThirdSem,
                            average,
                            secondSemAverage,
                            thirdSemAverage,
                            score,
                            student,
                            b1stgpa,
                            b2ndgpa,
                            b3rdgpa,
                            e1stgpa,
                            e2ndgpa,
                            e3rdgpa,
                            m1stgpa,
                            m2ndgpa,
                            m3rdgpa,
                            r1stgpa,
                            r2ndgpa,
                            r3rdgpa,
                            g1stgpa,
                            g2ndgpa,
                            g3rdgpa,
                            d1stgpa,
                            d2ndgpa,
                            d3rdgpa,
                            b1stgradePoint,
                            b2ndgradePoint,
                            b3rdgradePoint,
                            e1stgradePoint,
                            e2ndgradePoint,
                            e3rdgradePoint,
                            m1stgradePoint,
                            m2ndgradePoint,
                            m3rdgradePoint,
                            r1stgradePoint,
                            r2ndgradePoint,
                            r3rdgradePoint,
                            g1stgradePoint,
                            g2ndgradePoint,
                            g3rdgradePoint,
                            d1stgradePoint,
                            d2ndgradePoint,
                            d3rdgradePoint,
                            firstSemTotalGrade,
                            secondSemTotalGrade,
                            thirdSemTotalGrade,
                            firstSemGrade,
                            secondSemGrade,
                            thirdSemGrade,
                            overAllTotalGrade,
                            overAllGrade,
                            totalAverageMarks,
                            studentRole
                        });

                    }
                    if (student && !score) {
                        if(studentRole === 'admin'){
                            const error_msg = 'Exam Scores Data is empty for this ID !!!!! Please insert first';
                            res.render("student_Info", {student, error_msg, score});
                        }else{
                            const error_msg = 'Exam Scores Data is empty !!!!!';
                            res.render("stdnt_Info", {student, error_msg, score});
                        }
                    }
                }
            }
            if (!student) {
                req.flash("error_msg", " STUDENT ID IS NOT REGISTERED ! ");
                res.redirect("registration");
            }
        });
    });
});

/// FROM THE NURSERY RESULT PAGE MOVE TO THE NURSERY RESULT EDIT PAGE
router.post("/nurseryResultEdit", ensureAuthenticated, (req, res) => {
    const id = req.body.id;
    nurserySub.findOne({
        students_id: id
    }, (err, score) => {
        studentDB.findOne({
            students_id: id
        }, (err, student) => {
            if (score && student) {
                res.render("nurseryResultEdit", {score, student});
            } else {
                res.send("<h1 style='text-align:center;position:absolute;top:30vh;left:40vw'> SCORE DID NO" +
                        "T FOUND </h1>");
            }
        });
    });
});

// POST ROUTES UPDATING THE SCORES FIRST SEMESTER'S SCORES UPDATING ROUTE
router.post("/nurseryFirstSemEdit", ensureAuthenticated, (req, res) => {
    const {
        id,
        bangla_firstSem,
        english_firstSem,
        math_firstSem,
        religion_firstSem,
        drawing_firstSem,
        general_knowledge_firstSem
    } = req.body;

    nurserySub.updateOne({
        students_id: id
    }, {
        $set: {
            "bangla.firstSem": bangla_firstSem,
            "english.firstSem": english_firstSem,
            "math.firstSem": math_firstSem,
            "religion.firstSem": religion_firstSem,
            "drawing.firstSem": drawing_firstSem,
            "general_knowledge.firstSem": general_knowledge_firstSem
        }
    }).then(score => {
        studentDB
            .findOne({students_id: id})
            .then(student => {
                nurserySub.findOne({
                    students_id: id
                }, (err, score) => {
                    res.render("nurseryResultEdit", {student, score});
                });
            })
            .catch(err => {
                console.log(err);
                res.send(`
                <h1 style='text-align:center;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%)'> 404 ERROR ! </h1>
            `)
            });
    }).catch(err => {
        console.log(err);
        res.send(`
        <h1 style='text-align:center;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%)'> 404 ERROR ! </h1>
    `)
    });
});

// SECOND SEMESTER'S SCORES UPDATE ROUTE
router.post("/nurserySecondSemEdit", ensureAuthenticated, (req, res) => {
    const {
        id,
        bangla_secondSem,
        english_secondSem,
        math_secondSem,
        religion_secondSem,
        drawing_secondSem,
        general_knowledge_secondSem
    } = req.body;

    console.log({
        id,
        bangla_secondSem,
        english_secondSem,
        math_secondSem,
        religion_secondSem,
        drawing_secondSem,
        general_knowledge_secondSem
    });

    nurserySub.updateOne({
        students_id: id
    }, {
        $set: {
            "bangla.secondSem": bangla_secondSem,
            "english.secondSem": english_secondSem,
            "math.secondSem": math_secondSem,
            "religion.secondSem": religion_secondSem,
            "drawing.secondSem": drawing_secondSem,
            "general_knowledge.secondSem": general_knowledge_secondSem
        }
    }).then(score => {
        studentDB
            .findOne({students_id: id})
            .then(student => {
                nurserySub.findOne({
                    students_id: id
                }, (err, score) => {
                    console.log(student);
                    res.render("nurseryResultEdit", {student, score});
                });
            })
            .catch(err => {
                console.log(err);
                res.send(`
                <h1 style='text-align:center;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%)'> 404 ERROR ! </h1>
            `)
            });
    }).catch(err => {
        console.log(err);
        res.send(`
        <h1 style='text-align:center;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%)'> 404 ERROR ! </h1>
    `)
    });
});

// THIRD SEMESTER'S SCORES UPDATE ROUTE
router.post("/nurseryThirdSemEdit", ensureAuthenticated, (req, res) => {
    const {
        id,
        bangla_thirdSem,
        english_thirdSem,
        math_thirdSem,
        religion_thirdSem,
        drawing_thirdSem,
        general_knowledge_thirdSem
    } = req.body;

    nurserySub.updateOne({
        students_id: id
    }, {
        $set: {
            "bangla.thirdSem": bangla_thirdSem,
            "english.thirdSem": english_thirdSem,
            "math.thirdSem": math_thirdSem,
            "religion.thirdSem": religion_thirdSem,
            "drawing.thirdSem": drawing_thirdSem,
            "general_knowledge.thirdSem": general_knowledge_thirdSem
        }
    }).then(score => {
        studentDB
            .findOne({students_id: id})
            .then(student => {
                nurserySub.findOne({
                    students_id: id
                }, (err, score) => {
                    res.render("nurseryResultEdit", {student, score});
                });
            })
            .catch(err => res.send("<h1 style='text-align:center;position:absolute;top:30vh;left:30vw'> SOMETHING BA" +
                    "D HAPPEND </h1>"));
    }).catch(err => res.send("<h1 style='text-align:center;position:absolute;top:30vh;left:30vw'> 404 ERROR ! " +
            "</h1>"));
});

router.get('/login', stdntforwardAuthenticated, (req, res) => {
    res.render('studentLogin');
});
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/student/dashboard',
        failureRedirect: '/student/login',
        failureFlash: true
    })(req, res, next);
});

router.get('/checkResult', stdntensureAuthenticated, (req, res) => {
    const {id} = req.body.id;
    nurserySub.findOne({
        students_id: id
    }, (err, score) => {
        if (student) {
            if (student.Class === "Nursery" || student.Class === "Play" || student.Class === "1" || student.Class === "2" || student.Class === "3") {
                if (student && score) {
                    var b1stgpa,
                        b2ndgpa,
                        b3rdgpa,
                        e1stgpa,
                        e2ndgpa,
                        e3rdgpa,
                        m1stgpa,
                        m2ndgpa,
                        m3rdgpa,
                        r1stgpa,
                        r2ndgpa,
                        r3rdgpa,
                        g1stgpa,
                        g2ndgpa,
                        g3rdgpa,
                        d1stgpa,
                        d2ndgpa,
                        d3rdgpa,
                        b1stgradePoint,
                        b2ndgradePoint,
                        b3rdgradePoint,
                        e1stgradePoint,
                        e2ndgradePoint,
                        e3rdgradePoint,
                        m1stgradePoint,
                        m2ndgradePoint,
                        m3rdgradePoint,
                        r1stgradePoint,
                        r2ndgradePoint,
                        r3rdgradePoint,
                        g1stgradePoint,
                        g2ndgradePoint,
                        g3rdgradePoint,
                        d1stgradePoint,
                        d2ndgradePoint,
                        d3rdgradePoint,
                        firstSemGrade,
                        secondSemGrade,
                        thirdSemGrade,
                        overAllGrade,
                        overAllTotalGrade,
                        totalAverageMarks;

                    var totalThirdSem,
                        thirdSemAverage,
                        tnumber;
                    totalThirdSem = score.bangla.thirdSem + score.english.thirdSem + score.math.thirdSem + score.religion.thirdSem + score.general_knowledge.thirdSem + score.drawing.thirdSem;
                    tnumber = totalThirdSem / 6;
                    thirdSemAverage = tnumber.toPrecision(4);

                    var totalFirstSem,
                        average,
                        fnumber;
                    totalFirstSem = score.bangla.firstSem + score.english.firstSem + score.math.firstSem + score.religion.firstSem + score.general_knowledge.firstSem + score.drawing.firstSem;
                    fnumber = totalFirstSem / 6;
                    average = fnumber.toPrecision(4);

                    var totalSecondSem,
                        secondSemAverage,
                        Snumber;
                    totalSecondSem = score.bangla.secondSem + score.english.secondSem + score.math.secondSem + score.religion.secondSem + score.general_knowledge.secondSem + score.drawing.secondSem;
                    Snumber = totalSecondSem / 6;
                    secondSemAverage = Snumber.toPrecision(4);

                    // For total average marks calculation
                    totalAverageMarks = ((fnumber + Snumber + tnumber) / 3).toPrecision(4);

                    //  Grading detection and showing the grade point  FIRST SEMESTER SUBJECTS'
                    // marks 80-100
                    if (score.bangla.firstSem >= 80) {
                        b1stgpa = "A+";
                        b1stgradePoint = 5.00;
                    }
                    if (score.english.firstSem >= 80) {
                        e1stgpa = "A+";
                        e1stgradePoint = 5.00;
                    }
                    if (score.math.firstSem >= 80) {
                        m1stgpa = "A+";
                        m1stgradePoint = 5.00;
                    }
                    if (score.religion.firstSem >= 80) {
                        r1stgpa = "A+";
                        r1stgradePoint = 5.00;
                    }
                    if (score.general_knowledge.firstSem >= 80) {
                        g1stgpa = "A+";
                        g1stgradePoint = 5.00;
                    }
                    if (score.drawing.firstSem >= 80) {
                        d1stgpa = "A+";
                        d1stgradePoint = 5.00;
                    }

                    // marks 70-80
                    if (score.bangla.firstSem >= 70 && score.bangla.firstSem < 80) {
                        b1stgpa = "A";
                        b1stgradePoint = 4.00;
                    }
                    if (score.english.firstSem >= 70 && score.english.firstSem < 80) {
                        e1stgpa = "A";
                        e1stgradePoint = 4.00;
                    }
                    if (score.math.firstSem >= 70 && score.math.firstSem < 80) {
                        m1stgpa = "A";
                        m1stgradePoint = 4.00;
                    }
                    if (score.religion.firstSem >= 70 && score.religion.firstSem < 80) {
                        r1stgpa = "A";
                        r1stgradePoint = 4.00;
                    }
                    if (score.general_knowledge.firstSem >= 70 && score.general_knowledge.firstSem < 80) {
                        g1stgpa = "A";
                        g1stgradePoint = 4.00;
                    }
                    if (score.drawing.firstSem >= 70 && score.drawing.firstSem < 80) {
                        d1stgpa = "A";
                        d1stgradePoint = 4.00;
                    }
                    // markd 60-70
                    if (score.bangla.firstSem >= 60 && score.bangla.firstSem < 70) {
                        b1stgpa = "A-";
                        b1stgradePoint = 3.50;
                    }
                    if (score.english.firstSem >= 60 && score.english.firstSem < 70) {
                        e1stgpa = "A-";
                        e1stgradePoint = 3.50;
                    }
                    if (score.math.firstSem >= 60 && score.math.firstSem < 70) {
                        m1stgpa = "A-";
                        m1stgradePoint = 3.50;
                    }
                    if (score.religion.firstSem >= 60 && score.religion.firstSem < 70) {
                        r1stgpa = "A-";
                        r1stgradePoint = 3.50;
                    }
                    if (score.general_knowledge.firstSem >= 60 && score.general_knowledge.firstSem < 70) {
                        g1stgpa = "A-";
                        g1stgradePoint = 3.50;
                    }
                    if (score.drawing.firstSem >= 60 && score.drawing.firstSem < 70) {
                        d1stgpa = "A-";
                        d1stgradePoint = 3.50;
                    }

                    // marks 50-60
                    if (score.bangla.firstSem >= 50 && score.bangla.firstSem < 60) {
                        b1stgpa = "B";
                        b1stgradePoint = 3.00;
                    }
                    if (score.english.firstSem >= 50 && score.english.firstSem < 60) {
                        e1stgpa = "B";
                        e1stgradePoint = 3.00;
                    }
                    if (score.math.firstSem >= 50 && score.math.firstSem < 60) {
                        m1stgpa = "B";
                        m1stgradePoint = 3.00;
                    }
                    if (score.religion.firstSem >= 50 && score.religion.firstSem < 60) {
                        r1stgpa = "B";
                        r1stgradePoint = 3.00;
                    }
                    if (score.general_knowledge.firstSem >= 50 && score.general_knowledge.firstSem < 60) {
                        g1stgpa = "B";
                        g1stgradePoint = 3.00;
                    }
                    if (score.drawing.firstSem >= 50 && score.drawing.firstSem < 60) {
                        d1stgpa = "B";
                        d1stgradePoint = 3.00;
                    }

                    // marks 40-50
                    if (score.bangla.firstSem >= 40 && score.bangla.firstSem < 50) {
                        b1stgpa = "C";
                        b1stgradePoint = 2.00;
                    }
                    if (score.english.firstSem >= 40 && score.english.firstSem < 50) {
                        e1stgpa = "C";
                        e1stgradePoint = 2.00;
                    }
                    if (score.math.firstSem >= 40 && score.math.firstSem < 50) {
                        m1stgpa = "C";
                        m1stgradePoint = 2.00;
                    }
                    if (score.religion.firstSem >= 40 && score.religion.firstSem < 50) {
                        r1stgpa = "C";
                        r1stgradePoint = 2.00;
                    }
                    if (score.general_knowledge.firstSem >= 40 && score.general_knowledge.firstSem < 50) {
                        g1stgpa = "C";
                        g1stgradePoint = 2.00;
                    }
                    if (score.drawing.firstSem >= 40 && score.drawing.firstSem < 50) {
                        d1stgpa = "C";
                        d1stgradePoint = 2.00;
                    }

                    // marks 33-40
                    if (score.bangla.firstSem >= 33 && score.bangla.firstSem < 40) {
                        b1stgpa = "D";
                        b1stgradePoint = 1.00;
                    }
                    if (score.english.firstSem >= 33 && score.english.firstSem < 40) {
                        e1stgpa = "D";
                        e1stgradePoint = 1.00;
                    }
                    if (score.math.firstSem >= 33 && score.math.firstSem < 40) {
                        m1stgpa = "D";
                        m1stgradePoint = 1.00;
                    }
                    if (score.religion.firstSem >= 33 && score.religion.firstSem < 40) {
                        r1stgpa = "D";
                        r1stgradePoint = 1.00;
                    }
                    if (score.general_knowledge.firstSem >= 33 && score.general_knowledge.firstSem < 40) {
                        g1stgpa = "D";
                        g1stgradePoint = 1.00;
                    }
                    if (score.drawing.firstSem >= 33 && score.drawing.firstSem < 40) {
                        d1stgpa = "D";
                        d1stgradePoint = 1.00;
                    }

                    // marks 00-32
                    if (score.bangla.firstSem >= 0 && score.bangla.firstSem < 33) {
                        b1stgpa = "F";
                        b1stgradePoint = 0.00;
                    }
                    if (score.english.firstSem >= 0 && score.english.firstSem < 33) {
                        e1stgpa = "F";
                        e1stgradePoint = 0.00;
                    }
                    if (score.math.firstSem >= 0 && score.math.firstSem < 33) {
                        m1stgpa = "F";
                        m1stgradePoint = 0.00;
                    }
                    if (score.religion.firstSem >= 0 && score.religion.firstSem < 33) {
                        r1stgpa = "F";
                        r1stgradePoint = 0.00;
                    }
                    if (score.general_knowledge.firstSem >= 0 && score.general_knowledge.firstSem < 33) {
                        g1stgpa = "F";
                        g1stgradePoint = 0.00;
                    }
                    if (score.drawing.firstSem >= 0 && score.drawing.firstSem < 33) {
                        d1stgpa = "F";
                        d1stgradePoint = 0.00;
                    }

                    //  SECOND SEMESTER SUBJECTS  mark 80-100
                    if (score.bangla.secondSem >= 80) {
                        b2ndgpa = "A+";
                        b2ndgradePoint = 5.00;
                    }
                    if (score.english.secondSem >= 80) {
                        e2ndgpa = "A+";
                        e2ndgradePoint = 5.00;
                    }
                    if (score.math.secondSem >= 80) {
                        m2ndgpa = "A+";
                        m2ndgradePoint = 5.00;
                    }
                    if (score.religion.secondSem >= 80) {
                        r2ndgpa = "A+";
                        r2ndgradePoint = 5.00;
                    }
                    if (score.general_knowledge.secondSem >= 80) {
                        g2ndgpa = "A+";
                        g2ndgradePoint = 5.00;
                    }
                    if (score.drawing.secondSem >= 80) {
                        d2ndgpa = "A+";
                        d2ndgradePoint = 5.00;
                    }

                    // marks 70-80
                    if (score.bangla.secondSem >= 70 && score.bangla.secondSem < 80) {
                        b2ndgpa = "A";
                        b2ndgradePoint = 4.00;
                    }
                    if (score.english.secondSem >= 70 && score.english.secondSem < 80) {
                        e2ndgpa = "A";
                        e2ndgradePoint = 4.00;
                    }
                    if (score.math.secondSem >= 70 && score.math.secondSem < 80) {
                        m2ndgpa = "A";
                        m2ndgradePoint = 4.00;
                    }
                    if (score.religion.secondSem >= 70 && score.religion.secondSem < 80) {
                        r2ndgpa = "A";
                        r2ndgradePoint = 4.00;
                    }
                    if (score.general_knowledge.secondSem >= 70 && score.general_knowledge.secondSem < 80) {
                        g2ndgpa = "A";
                        g2ndgradePoint = 4.00;
                    }
                    if (score.drawing.secondSem >= 70 && score.drawing.secondSem < 80) {
                        d2ndgpa = "A";
                        d2ndgradePoint = 4.00;
                    }
                    // markd 60-70
                    if (score.bangla.secondSem >= 60 && score.bangla.secondSem < 70) {
                        b2ndgpa = "A-";
                        b2ndgradePoint = 3.50;
                    }
                    if (score.english.secondSem >= 60 && score.english.secondSem < 70) {
                        e2ndgpa = "A-";
                        e2ndgradePoint = 3.50;
                    }
                    if (score.math.secondSem >= 60 && score.math.secondSem < 70) {
                        m2ndgpa = "A-";
                        m2ndgradePoint = 3.50;
                    }
                    if (score.religion.secondSem >= 60 && score.religion.secondSem < 70) {
                        r2ndgpa = "A-";
                        r2ndgradePoint = 3.50;
                    }
                    if (score.general_knowledge.secondSem >= 60 && score.general_knowledge.secondSem < 70) {
                        g2ndgpa = "A-";
                        g2ndgradePoint = 3.50;
                    }
                    if (score.drawing.secondSem >= 60 && score.drawing.secondSem < 70) {
                        d2ndgpa = "A-";
                        d2ndgradePoint = 3.50;
                    }

                    // marks 50-60
                    if (score.bangla.secondSem >= 50 && score.bangla.secondSem < 60) {
                        b2ndgpa = "B";
                        b2ndgradePoint = 3.00;
                    }
                    if (score.english.secondSem >= 50 && score.english.secondSem < 60) {
                        e2ndgpa = "B";
                        e2ndgradePoint = 3.00;
                    }
                    if (score.math.secondSem >= 50 && score.math.secondSem < 60) {
                        m2ndgpa = "B";
                        m2ndgradePoint = 3.00;
                    }
                    if (score.religion.secondSem >= 50 && score.religion.secondSem < 60) {
                        r2ndgpa = "B";
                        r2ndgradePoint = 3.00;
                    }
                    if (score.general_knowledge.secondSem >= 50 && score.general_knowledge.secondSem < 60) {
                        g2ndgpa = "B";
                        g2ndgradePoint = 3.00;
                    }
                    if (score.drawing.secondSem >= 50 && score.drawing.secondSem < 60) {
                        d2ndgpa = "B";
                        d2ndgradePoint = 3.00;
                    }

                    // marks 40-50
                    if (score.bangla.secondSem >= 40 && score.bangla.secondSem < 50) {
                        b2ndgpa = "C";
                        b2ndgradePoint = 2.00;
                    }
                    if (score.english.secondSem >= 40 && score.english.secondSem < 50) {
                        e2ndgpa = "C";
                        e2ndgradePoint = 2.00;
                    }
                    if (score.math.secondSem >= 40 && score.math.secondSem < 50) {
                        m2ndgpa = "C";
                        m2ndgradePoint = 2.00;
                    }
                    if (score.religion.secondSem >= 40 && score.religion.secondSem < 50) {
                        r2ndgpa = "C";
                        r2ndgradePoint = 2.00;
                    }
                    if (score.general_knowledge.secondSem >= 40 && score.general_knowledge.secondSem < 50) {
                        g2ndgpa = "C";
                        g2ndgradePoint = 2.00;
                    }
                    if (score.drawing.secondSem >= 40 && score.drawing.secondSem < 50) {
                        d2ndgpa = "C";
                        d2ndgradePoint = 2.00;
                    }

                    // marks 33-40
                    if (score.bangla.secondSem >= 33 && score.bangla.secondSem < 40) {
                        b2ndgpa = "D";
                        b2ndgradePoint = 1.00;
                    }
                    if (score.english.secondSem >= 33 && score.english.secondSem < 40) {
                        e2ndgpa = "D";
                        e2ndgradePoint = 1.00;
                    }
                    if (score.math.secondSem >= 33 && score.math.secondSem < 40) {
                        m2ndgpa = "D";
                        m2ndgradePoint = 1.00;
                    }
                    if (score.religion.secondSem >= 33 && score.religion.secondSem < 40) {
                        r2ndgpa = "D";
                        r2ndgradePoint = 1.00;
                    }
                    if (score.general_knowledge.secondSem >= 33 && score.general_knowledge.secondSem < 40) {
                        g2ndgpa = "D";
                        g2ndgradePoint = 1.00;
                    }
                    if (score.drawing.secondSem >= 33 && score.drawing.secondSem < 40) {
                        d2ndgpa = "D";
                        d2ndgradePoint = 1.00;
                    }

                    // MARKS 00-32
                    if (score.bangla.secondSem >= 0 && score.bangla.secondSem < 33) {
                        b2ndgpa = "F";
                        b2ndgradePoint = 0.00;
                    }
                    if (score.english.secondSem >= 0 && score.english.secondSem < 33) {
                        e2ndgpa = "F";
                        e2ndgradePoint = 0.00;
                    }
                    if (score.math.secondSem >= 0 && score.math.secondSem < 33) {
                        m2ndgpa = "F";
                        m2ndgradePoint = 0.00;
                    }
                    if (score.religion.secondSem >= 0 && score.religion.secondSem < 33) {
                        r2ndgpa = "F";
                        r2ndgradePoint = 0.00;
                    }
                    if (score.general_knowledge.secondSem >= 0 && score.general_knowledge.secondSem < 33) {
                        g2ndgpa = "F";
                        g2ndgradePoint = 0.00;
                    }
                    if (score.drawing.secondSem >= 0 && score.drawing.secondSem < 33) {
                        d2ndgpa = "F";
                        d2ndgradePoint = 0.00;
                    }

                    //  THIRD SEMESTER SUBJECTS marks 80-100
                    if (score.bangla.thirdSem >= 80) {
                        b3rdgpa = "A+";
                        b3rdgradePoint = 5.00;
                    }
                    if (score.english.thirdSem >= 80) {
                        e3rdgpa = "A+";
                        e3rdgradePoint = 5.00;
                    }
                    if (score.math.thirdSem >= 80) {
                        m3rdgpa = "A+";
                        m3rdgradePoint = 5.00;
                    }
                    if (score.religion.thirdSem >= 80) {
                        r3rdgpa = "A+";
                        r3rdgradePoint = 5.00;
                    }
                    if (score.general_knowledge.thirdSem >= 80) {
                        g3rdgpa = "A+";
                        g3rdgradePoint = 5.00;
                    }
                    if (score.drawing.thirdSem >= 80) {
                        d3rdgpa = "A+";
                        d3rdgradePoint = 5.00;
                    }

                    // marks 70-80
                    if (score.bangla.thirdSem >= 70 && score.bangla.thirdSem < 80) {
                        b3rdgpa = "A";
                        b3rdgradePoint = 4.00;
                    }
                    if (score.english.thirdSem >= 70 && score.english.thirdSem < 80) {
                        e3rdgpa = "A";
                        e3rdgradePoint = 4.00;
                    }
                    if (score.math.thirdSem >= 70 && score.math.thirdSem < 80) {
                        m3rdgpa = "A";
                        m3rdgradePoint = 4.00;
                    }
                    if (score.religion.thirdSem >= 70 && score.religion.thirdSem < 80) {
                        r3rdgpa = "A";
                        r3rdgradePoint = 4.00;
                    }
                    if (score.general_knowledge.thirdSem >= 70 && score.general_knowledge.thirdSem < 80) {
                        g3rdgpa = "A";
                        g3rdgradePoint = 4.00;
                    }
                    if (score.drawing.thirdSem >= 70 && score.drawing.thirdSem < 80) {
                        d3rdgpa = "A";
                        d3rdgradePoint = 4.00;
                    }
                    // markd 60-70
                    if (score.bangla.thirdSem >= 60 && score.bangla.thirdSem < 70) {
                        b3rdgpa = "A-";
                        b3rdgradePoint = 3.50;
                    }
                    if (score.english.thirdSem >= 60 && score.english.thirdSem < 70) {
                        e3rdgpa = "A-";
                        e3rdgradePoint = 3.50;
                    }
                    if (score.math.thirdSem >= 60 && score.math.thirdSem < 70) {
                        m3rdgpa = "A-";
                        m3rdgradePoint = 3.50;
                    }
                    if (score.religion.thirdSem >= 60 && score.religion.thirdSem < 70) {
                        r3rdgpa = "A-";
                        r3rdgradePoint = 3.50;
                    }
                    if (score.general_knowledge.thirdSem >= 60 && score.general_knowledge.thirdSem < 70) {
                        g3rdgpa = "A-";
                        g3rdgradePoint = 3.50;
                    }
                    if (score.drawing.thirdSem >= 60 && score.drawing.thirdSem < 70) {
                        d3rdgpa = "A-";
                        d3rdgradePoint = 3.50;
                    }

                    // marks 50-60
                    if (score.bangla.thirdSem >= 50 && score.bangla.thirdSem < 60) {
                        b3rdgpa = "B";
                        b3rdgradePoint = 3.00;
                    }
                    if (score.english.thirdSem >= 50 && score.english.thirdSem < 60) {
                        e3rdgpa = "B";
                        e3rdgradePoint = 3.00;
                    }
                    if (score.math.thirdSem >= 50 && score.math.thirdSem < 60) {
                        m3rdgpa = "B";
                        m3rdgradePoint = 3.00;
                    }
                    if (score.religion.thirdSem >= 50 && score.religion.thirdSem < 60) {
                        r3rdgpa = "B";
                        r3rdgradePoint = 3.00;
                    }
                    if (score.general_knowledge.thirdSem >= 50 && score.general_knowledge.thirdSem < 60) {
                        g3rdgpa = "B";
                        g3rdgradePoint = 3.00;
                    }
                    if (score.drawing.thirdSem >= 50 && score.drawing.thirdSem < 60) {
                        d3rdgpa = "B";
                        d3rdgradePoint = 3.00;
                    }

                    // marks 40-50
                    if (score.bangla.thirdSem >= 40 && score.bangla.thirdSem < 50) {
                        b3rdgpa = "C";
                        b3rdgradePoint = 2.00;
                    }
                    if (score.english.thirdSem >= 40 && score.english.thirdSem < 50) {
                        e3rdgpa = "C";
                        e3rdgradePoint = 2.00;
                    }
                    if (score.math.thirdSem >= 40 && score.math.thirdSem < 50) {
                        m3rdgpa = "C";
                        m3rdgradePoint = 2.00;
                    }
                    if (score.religion.thirdSem >= 40 && score.religion.thirdSem < 50) {
                        r3rdgpa = "C";
                        r3rdgradePoint = 2.00;
                    }
                    if (score.general_knowledge.thirdSem >= 40 && score.general_knowledge.thirdSem < 50) {
                        g3rdgpa = "C";
                        g3rdgradePoint = 2.00;
                    }
                    if (score.drawing.thirdSem >= 40 && score.drawing.thirdSem < 50) {
                        d3rdgpa = "C";
                        d3rdgradePoint = 2.00;
                    }

                    // marks 33-40
                    if (score.bangla.thirdSem >= 33 && score.bangla.thirdSem < 40) {
                        b3rdgpa = "D";
                        b3rdgradePoint = 1.00;
                    }
                    if (score.english.thirdSem >= 33 && score.english.thirdSem < 40) {
                        e3rdgpa = "D";
                        e3rdgradePoint = 1.00;
                    }
                    if (score.math.thirdSem >= 33 && score.math.thirdSem < 40) {
                        m3rdgpa = "D";
                        m3rdgradePoint = 1.00;
                    }
                    if (score.religion.thirdSem >= 33 && score.religion.thirdSem < 40) {
                        r3rdgpa = "D";
                        r3rdgradePoint = 1.00;
                    }
                    if (score.general_knowledge.thirdSem >= 33 && score.general_knowledge.thirdSem < 40) {
                        g3rdgpa = "D";
                        g3rdgradePoint = 1.00;
                    }
                    if (score.drawing.thirdSem >= 33 && score.drawing.thirdSem < 40) {
                        d3rdgpa = "D";
                        d3rdgradePoint = 1.00;
                    }

                    // MARKS 00-32
                    if (score.bangla.thirdSem >= 0 && score.bangla.thirdSem < 33) {
                        b3rdgpa = "F";
                        b3rdgradePoint = 0.00;
                    }
                    if (score.english.thirdSem >= 0 && score.english.thirdSem < 33) {
                        e3rdgpa = "F";
                        e3rdgradePoint = 0.00;
                    }
                    if (score.math.thirdSem >= 0 && score.math.thirdSem < 33) {
                        m3rdgpa = "F";
                        m3rdgradePoint = 0.00;
                    }
                    if (score.religion.thirdSem >= 0 && score.religion.thirdSem < 33) {
                        r3rdgpa = "F";
                        r3rdgradePoint = 0.00;
                    }
                    if (score.general_knowledge.thirdSem >= 0 && score.general_knowledge.thirdSem < 33) {
                        g3rdgpa = "F";
                        g3rdgradePoint = 0.00;
                    }
                    if (score.drawing.thirdSem >= 0 && score.drawing.thirdSem < 33) {
                        d3rdgpa = "F";
                        d3rdgradePoint = 0.00;
                    }

                    //ANUAL GRADE POINTS
                    if (b3rdgradePoint == 0 || e3rdgradePoint == 0 || m3rdgradePoint == 0 || r3rdgradePoint == 0 || d3rdgradePoint == 0 || g3rdgradePoint == 0) {
                        thirdSemTotalGrade = 0;
                    } else {
                        thirdSemTotalGrade = (((b3rdgradePoint + e3rdgradePoint + m3rdgradePoint + r3rdgradePoint + d3rdgradePoint + g3rdgradePoint) - 2) / 5);
                        if (thirdSemTotalGrade > 5) {
                            thirdSemTotalGrade = 5;
                        }
                    }
                    if (b2ndgradePoint == 0 || e2ndgradePoint == 0 || m2ndgradePoint == 0 || r2ndgradePoint == 0 || d2ndgradePoint == 0 || g2ndgradePoint == 0) {
                        secondSemTotalGrade = 0;
                    } else {
                        secondSemTotalGrade = ((b2ndgradePoint + e2ndgradePoint + m2ndgradePoint + r2ndgradePoint + d2ndgradePoint + g2ndgradePoint) - 2) / 5;
                        if (secondSemTotalGrade > 5) {
                            secondSemTotalGrade = 5;
                        }
                    }
                    if (b1stgradePoint === 0 || e1stgradePoint === 0 || m1stgradePoint === 0 || r1stgradePoint === 0 || d1stgradePoint === 0 || g1stgradePoint === 0) {
                        firstSemTotalGrade = 0;
                    } else {
                        firstSemTotalGrade = ((b1stgradePoint + e1stgradePoint + m1stgradePoint + r1stgradePoint + d1stgradePoint + g1stgradePoint) - 2) / 5;
                        if (firstSemTotalGrade > 5) {
                            firstSemTotalGrade = 5;
                        }
                    }
                    if (firstSemTotalGrade == 0 || secondSemTotalGrade == 0 || thirdSemTotalGrade == 0) {
                        overAllTotalGrade = 0;
                    } else {
                        overAllTotalGrade = ((firstSemTotalGrade + secondSemTotalGrade + thirdSemTotalGrade) / 3).toPrecision(3);
                    }

                    // SEMESTER TOTAL GRADE CALCULATION
                    if (firstSemTotalGrade == 5) {
                        firstSemGrade = "A+";
                    }
                    if (firstSemTotalGrade >= 4 && firstSemTotalGrade < 5) {
                        firstSemGrade = "A";
                    }
                    if (firstSemTotalGrade >= 3 && firstSemTotalGrade < 4) {
                        firstSemGrade = "A-";
                    }
                    if (firstSemTotalGrade >= 2 && firstSemTotalGrade < 3) {
                        firstSemGrade = "B";
                    }
                    if (firstSemTotalGrade >= 1 && firstSemTotalGrade < 2) {
                        firstSemGrade = "C";
                    }
                    if (firstSemTotalGrade >= 0 && firstSemTotalGrade < 1) {
                        firstSemGrade = "D";
                    }
                    if (firstSemTotalGrade == 0) {
                        firstSemGrade = "F";
                    }
                    if (secondSemTotalGrade == 5) {
                        secondSemGrade = "A+";
                    }
                    if (secondSemTotalGrade >= 4 && secondSemTotalGrade < 5) {
                        secondSemGrade = "A";
                    }
                    if (secondSemTotalGrade >= 3 && secondSemTotalGrade < 4) {
                        secondSemGrade = "A-";
                    }
                    if (secondSemTotalGrade >= 2 && secondSemTotalGrade < 3) {
                        secondSemGrade = "B";
                    }
                    if (secondSemTotalGrade >= 1 && secondSemTotalGrade < 2) {
                        secondSemGrade = "C";
                    }
                    if (secondSemTotalGrade >= 0 && secondSemTotalGrade < 1) {
                        secondSemGrade = "D";
                    }
                    if (secondSemTotalGrade == 0) {
                        secondSemGrade = "F";
                    }
                    if (thirdSemTotalGrade == 5) {
                        thirdSemGrade = "A+";
                    }
                    if (thirdSemTotalGrade >= 4 && thirdSemTotalGrade < 5) {
                        thirdSemGrade = "A";
                    }
                    if (thirdSemTotalGrade >= 3 && thirdSemTotalGrade < 4) {
                        thirdSemGrade = "A-";
                    }
                    if (thirdSemTotalGrade >= 2 && thirdSemTotalGrade < 3) {
                        thirdSemGrade = "B";
                    }
                    if (thirdSemTotalGrade >= 1 && thirdSemTotalGrade < 2) {
                        thirdSemGrade = "C";
                    }
                    if (thirdSemTotalGrade >= 0 && thirdSemTotalGrade < 1) {
                        thirdSemGrade = "D";
                    }
                    if (thirdSemTotalGrade == 0) {
                        thirdSemGrade = "F";
                    }

                    // OVERALL TOTAL GRADE CALCULATION
                    if (overAllTotalGrade == 5) {
                        overAllGrade = "A+";
                    }
                    if (overAllTotalGrade >= 4 && overAllTotalGrade < 5) {
                        overAllGrade = "A";
                    }
                    if (overAllTotalGrade >= 3 && overAllTotalGrade < 4) {
                        overAllGrade = "A-";
                    }
                    if (overAllTotalGrade >= 2 && overAllTotalGrade < 3) {
                        overAllGrade = "B";
                    }
                    if (overAllTotalGrade >= 1 && overAllTotalGrade < 2) {
                        overAllGrade = "C";
                    }
                    if (overAllTotalGrade >= 0 && overAllTotalGrade < 1) {
                        overAllGrade = "D";
                    }
                    if (overAllTotalGrade == 0) {
                        overAllGrade = "F";
                    }

                    res.render("nurseryResult", {
                        totalFirstSem,
                        totalSecondSem,
                        totalThirdSem,
                        average,
                        secondSemAverage,
                        thirdSemAverage,
                        score,
                        student,
                        b1stgpa,
                        b2ndgpa,
                        b3rdgpa,
                        e1stgpa,
                        e2ndgpa,
                        e3rdgpa,
                        m1stgpa,
                        m2ndgpa,
                        m3rdgpa,
                        r1stgpa,
                        r2ndgpa,
                        r3rdgpa,
                        g1stgpa,
                        g2ndgpa,
                        g3rdgpa,
                        d1stgpa,
                        d2ndgpa,
                        d3rdgpa,
                        b1stgradePoint,
                        b2ndgradePoint,
                        b3rdgradePoint,
                        e1stgradePoint,
                        e2ndgradePoint,
                        e3rdgradePoint,
                        m1stgradePoint,
                        m2ndgradePoint,
                        m3rdgradePoint,
                        r1stgradePoint,
                        r2ndgradePoint,
                        r3rdgradePoint,
                        g1stgradePoint,
                        g2ndgradePoint,
                        g3rdgradePoint,
                        d1stgradePoint,
                        d2ndgradePoint,
                        d3rdgradePoint,
                        firstSemTotalGrade,
                        secondSemTotalGrade,
                        thirdSemTotalGrade,
                        firstSemGrade,
                        secondSemGrade,
                        thirdSemGrade,
                        overAllTotalGrade,
                        overAllGrade,
                        totalAverageMarks
                    });

                }
                if (student && !score) {
                    const error_msg = 'Exam Scores Data is empty for this ID !!!!! Please insert first';
                    res.render("student_Info", {student, error_msg, score});
                }
            }
        }
    });
});

router.get('/dashboard', stdntensureAuthenticated, (req, res) => {
    nurserySub.findOne({
        students_id: req.user.students_id
    }, (err, score) => {
        studentDB
            .findOne({students_id: req.user.students_id})
            .then(student => {
                if (student) {
                    res.render("stdnt_info", {student, score});
                } else {
                    const error_msg = ' STUDENT ID IS NOT REGISTERED ';
                    res.render("stdnt_info", {
                        student: false,
                        error_msg
                    });
                }

            });
    });
});

router.get('/stdntlogout', (req, res) => {
    req.logout();
    res.redirect("/student/login");
});

module.exports = router;