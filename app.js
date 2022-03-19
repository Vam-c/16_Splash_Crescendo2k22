require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const https = require("https");

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
    email: String
});
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

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
               res.render("alert",{message: "Successfully registered in", redirect: "/register"});
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
                    res.render("alert",{message: "Successfully logged in", redirect: "/login"});  
                }      
            })(req, res, function(){
               //why is this required for the previous page to render.
            });
        }     
    });
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