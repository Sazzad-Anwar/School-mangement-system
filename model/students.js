//jshint esversion:8
const mongoose = require("mongoose");

const Studentschema = new mongoose.Schema({
    students_name:{
        type: String,
        required: true
    },
    students_id:{
        type:Number,
        required: true
    },
    Class:{
        type: String,
        required:true,
        
    },
    section:{
        type: String,
        required: true,
        
    },
    father_name:{
        type: String,
        required: true
    },
    mother_name:{
        type: String,
        required: true
    },
    dateOfBirth:{
        type: String,
        required: true
    },
    contact_number:{
        type: String,
        required: [true, 'Phone number is required']
    },
    contact_rel:{
        type: String,
        required: true,
    },
    admission_date:{
        type:String,
        required: true
    },
    session:{
        type:String,
        required: true
    },
    image:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required: true
    },
    role:{
        type: String,
        default: 'student',
    }
});

const Student = mongoose.model("Student", Studentschema);

module.exports = Student;