import express from 'express';
import mongoose, { ConnectOptions, Error } from 'mongoose';
import dotenv from "dotenv";
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import User from './User';
import { IMongoDBUser } from './types'
const GoogleStrategy = require('passport-google-oauth20').Strategy;


dotenv.config();

const app = express();
const PORT=5000
// This is the recomended way to connect to the mongodb database using mongoose. source: https://docs.cyclic.sh/how-to/using-mongo-db#connection-example-mongoclient

mongoose.connect(process.env.MONGO_URI!,{
  useUnifiedTopology: true,
  useNewUrlParser: true
} as ConnectOptions )
.then(()=>{
   
  console.log("Connected to mongodb successfully"
);
// We will start to listen for request once the DB is connected
app.listen(process.env.PORT || PORT,()=>{
  console.log("server is running on port "+PORT)
})
})
.catch((err:Error)=>{console.log(err)});

// Middleware
app.use(express.json());
app.use(cors({ origin:["https://decker.vercel.app","http://localhost:5173","http://localhost:3000","https://query-silk.vercel.app"] ,credentials:true}))

app.set("trust proxy", 1);

app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
    cookie: {
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // One Week
    }
  }))


app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user: IMongoDBUser, done: any) => {
  return done(null, user._id);
});

passport.deserializeUser((id: string, done: any) => {

  User.findById(id, (err: Error, doc: IMongoDBUser) => {
    // Whatever we return goes to the client and binds to the req.user property
    return done(null, doc);
  })
})


passport.use(new GoogleStrategy({
  clientID: `${process.env.CLIENT_ID}`,
  clientSecret: `${process.env.CLIENT_SECRET}`,
  callbackURL: "/auth/google/callback"
},
  function (_: any, __: any, profile: any, cb: any) {

    User.findOne({ googleId: profile.id }, async (err: Error, doc: IMongoDBUser) => {

      if (err) {
        return cb(err, null);
      }

      if (!doc) {
        const newUser = new User({
          googleId: profile.id,
          username: profile.name.givenName
        });

        await newUser.save();
        cb(null, newUser);
      }
      cb(null, doc);
    })

  }));





app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }),
  function (req, res) {
    res.redirect('http://localhost:5173');
  });




app.get("/", (req, res) => {
  res.send("Helllo WOlrd");
})

app.get("/getuser", (req, res) => {
  console.log(req.user)
  res.send(req.user);
})

app.get("/auth/logout", (req, res) => {
  if (req.user) {
    req.logout();
    res.send("done");
  }
})


