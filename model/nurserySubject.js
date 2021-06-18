//jshint esversion:8
const mongoose = require("mongoose");

const subjecSchema = new mongoose.Schema({
    students_id:{
        type:Number,
        required:true
    },
    english:{
        firstSem:{
            type: Number,
            require: true
        },
        secondSem:{
            type: Number,
            require: true
        },
        thirdSem:{
            type: Number,
            require: true
        }
    },
    bangla:{
        firstSem:{
            type: Number,
            require: true
        },
        secondSem:{
            type: Number,
            require: true
        },
        thirdSem:{
            type: Number,
            require: true
        }
    },
    math:{
        firstSem:{
            type: Number,
            require: true
        },
        secondSem:{
            type: Number,
            require: true
        },
        thirdSem:{
            type: Number,
            require: true
        }
    },
    religion:{
        firstSem:{
            type: Number,
            require: true
        },
        secondSem:{
            type: Number,
            require: true
        },
        thirdSem:{
            type: Number,
            require: true
        }
    },
    drawing:{
        firstSem:{
            type: Number,
            require: true
        },
        secondSem:{
            type: Number,
            require: true
        },
        thirdSem:{
            type: Number,
            require: true
        }
    },
    general_knowledge:{
        firstSem:{
            type: Number,
            require: true
        },
        secondSem:{
            type: Number,
            require: true
        },
        thirdSem:{
            type: Number,
            require: true
        }
    }
});

const NurserySub = new mongoose.model("NurserySub",subjecSchema);

module.exports = NurserySub;