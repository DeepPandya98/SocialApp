const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
const config = require('./config');

admin.initializeApp();

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

const validator = require('email-validator');


app.get('/posts', (req, res) => {
    db
    .collection('posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
        let posts = [];
        data.forEach(doc => {
            posts.push({
                postId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
        });
        return res.json(posts);
    })
    .catch(err => {
        console.error(err);
    });
});

app.post('/newPost', (req, res) => {
   const newPost = {
       body: req.body.body,
       userHandle: req.body.userHandle,
       createdAt: new Date().toISOString()
   };

   db
   .collection('posts')
   .add(newPost)
   .then(doc => {
       res.json({message: `document ${doc.id} created successfully`});
   })
   .catch(err => {
       res.status(500).json({error: 'Something went wrong'});
       console.error(err);
   });
});

const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

const isEmailValid = (email) => {
    return validator.validate(email);
}

// Signup route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    // TODO: validate data
    let errors = {};

    if(isEmpty(newUser.email)) {
        errors.email = 'Must not be empty'
    }
    else if (!isEmailValid(newUser.email)) {
        errors.email = 'Must be a valid email address'
    }

    if(isEmpty(newUser.password)){
        errors.password = 'Must not be empty'
    }
    if(newUser.password !== newUser.confirmPassword){
        errors.confirmPassword = 'Passwords must match';
    }
    if(isEmpty(newUser.handle)){
        errors.handle = 'Must not be empty'
    }

    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }


    // Check for handle being unique
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
         if(doc.exists){
             // Handle taken
             return res.status(400).json({ handle: 'This handle is already taken'})
         }
         else{
             // Create user
             return firebase
             .auth()
             .createUserWithEmailAndPassword(newUser.email, newUser.password);
         }
    })
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then(idToken => {
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId
        };

        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
        return res.status(201).json({ token });
    })
    .catch(err => {
        console.error(err);
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json( { email: 'Email is already in use'});
        }
        else{
            return res.status(500).json({ error: err.code });
        }
    });
});

exports.api = functions.https.onRequest(app);