require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const https = require("https");
const Razorpay = require("razorpay");
const instance = new Razorpay({
    key_id: process.env.RAZOR_KEY,
    key_secret: process.env.RAZOR_SECRET
  });

const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SECRET_PASSPORT,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//database endpoint: strayDB.
mongoose.connect("mongodb://admin-vamsee:"+process.env.MONGOPASS+"@cluster0-shard-00-00.upkqa.mongodb.net:27017,cluster0-shard-00-01.upkqa.mongodb.net:27017,cluster0-shard-00-02.upkqa.mongodb.net:27017/strayDB?ssl=true&replicaSet=atlas-f7p89f-shard-0&authSource=admin&retryWrites=true&w=majority",{useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    fullName: String,
    email: String,
    contact: Number
});
const straySchema = new mongoose.Schema({
    nickname: String,
    species: String,
    color: String,
    gender: String,
    address: String,
    age: Number,
    description: String,
    username: String                            //For identifying who updated the details.
});
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
const Stray = mongoose.model("Stray", straySchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//register page.
app.get("/register", function(req, res){
    res.render('signup');
});
app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err){
            res.render("alert",{message: err, redirect: "/register"});
        } else {
            passport.authenticate("local",{ failureRedirect: '/register'})(req, res, function(){
               // Render page after user authentication with req.user.username.
               const newUser = new User({
                username: req.body.username,
                fullName: req.body.fullName,
                email: req.body.email,
                contact: req.body.contact
               });
               newUser.save();
               res.redirect("/home");
            });
        }
    });
});

//login page.
app.get("/login", function(req, res){
    res.render("login");
});
app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if (err){
            res.render("alert",{message: err, redirect: "/login"});
        } else {
            passport.authenticate("local", {failureRedirect: '/login'}, function(err, thisModel, error){
                if(err){
                    console.log(err);
                } else if(error) {
                    res.render("alert",{message: error, redirect: "/login"});
                } else {
                    //Code after user is logged in to his account. access using req.user.username.
                    res.redirect("/home"); 
                }      
            })(req, res, function(){
               //why is this required for the previous page to render.
            });
        }     
    });
});


app.get("/home", function(req, res){
    if(req.isAuthenticated()){
        Stray.find({}, function(err, founditems){
            if(err){
                res.render("alert",{message: err, redirect: "/login"});
            } else {
                res.render("home",{strays: founditems});
            }
        });  
    } else {
        res.render("alert",{message: "User not authenticated.", redirect: "/login"});
    }
});
app.post("/home", function(req, res){
    if(req.isAuthenticated()){
        //render the contact details of person who uploaded stray details.
        res.render("alert",{message: "contact details of person who uploaded.", redirect: "/login"});
    } else {
        res.render("alert",{message: "User not authenticated.", redirect: "/login"});
    }
});

app.get("/upload", function(req, res){
    if(req.isAuthenticated()){
        res.render("upload");
    } else {
        res.render("alert",{message: "User not authenticated.", redirect: "/login"});
    }
});
app.post("/upload", function(req, res){
    if(req.isAuthenticated()){
        const newStray = new Stray({
            nickname: req.body.nickname,
            species: req.body.species,
            color: req.body.color,
            gender: req.body.gender,
            address: req.body.address,
            age: req.body.age,
            description: req.body.description,
            username: req.user.username
        });
        newStray.save();
        res.redirect("/home");
    } else {
        res.render("alert",{message: "User not authenticated.", redirect: "/login"});
    }
});


// app.get("/adopt", function(req, res){
//     if(req.isAuthenticated()){
//         res.render("adopt");
//     } else {
//         res.render("alert",{message: "User not authenticated.", redirect: "/login"});
//     }
// });

app.get("/donate", function(req, res){
    if(req.isAuthenticated()){
        res.render("donate");
    } else {
        res.render("alert",{message: "User not authenticated.", redirect: "/login"});
    }
    
});
//to donate an amount by user.
app.get("/check", function(req, res){
    const id = new Date();
        var options = {
            amount: 4500,  // amount in the smallest currency unit  req.body.amount (in paise)
            currency: "INR",
            receipt: "receiptid11"
        };
    instance.orders.create(options, function(err, order) {
        //res.render the page where razorpay ejs is pasted
        //res.render("razorpay",{amount: 2000});
        res.render("razorpay",{order_id: JSON.stringify(order.id)});
    });
    // instance.paymentLink.create({
    //     amount: 500,
    //     currency: "INR",
    //     accept_partial: false,
       
       
    //     customer: {
    //       name: "Gaurav Kumar",
    //       email: "gaurav.kumar@example.com",
    //       contact: 919999999999
    //     },
    //     notify: {
    //       sms: true,
    //       email: true
    //     },
    //     reminder_enable: true,
    //     notes: {
    //       policy_name: "Jeevan Bima"
    //     },
    //     callback_url: "/thankyou",    //a thankyou page after payment successfull.
    //     callback_method: "get"
    //   });
});
app.post("/donate", function(req, res){
    if(req.isAuthenticated()){
        //identify user using req.user.username.
        
        
      
        
    }
    
});


//logout.
app.get("/logout", function(req, res){
    req.logout();
    res.render("alert",{message: "Successfully logged out.", redirect: "/login"});
});

app.get("/", function(req, res){
    res.redirect("/login");
});



app.listen(3000, function(){
    console.log("Server listening to port 3000.");
});