const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors())
const knex =require('knex');
const CLarifai =require('clarifai');
const db= knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      port : 5432,
      user : 'postgres',
      password : 'okay',
      database : 'intelliphoto'
    }
  });

const appClarifai = new Clarifai.App({
  apiKey: 'e19573ee02d348aeb22358ff58f4e7cf'
});
app.get('/',(req,res) => {
  res.send('Working....')

})

app.post('/imageurl',(req,res) =>{
  
  appClarifai.models.predict(Clarifai.FACE_DETECT_MODEL,req.body.input)
  .then(data => res.json(data))
  .catch(err => res.status(400).json('API not working'))
})



app.post('/signin',(req,res)=>{
    const {email, password}=req.body;
    if(!email || !password ){
      return res.status(400).json('Login Failed')
    }
    db.select('email','hash').from('login')
    .where({email})
    .then(data => {
      const isValid = bcrypt.compareSync(password,data[0].hash);
      if(isValid){
        return db('users').select('*').where({email})
        .then( user => res.json(user[0]))
        .catch(err => res.status(400).json('Login Failed'))
      }else{
        res.status(400).json('Login Failed')
      }
    })
})

app.post('/register', (req,res)=> {
    const {email, name, password} =req.body;
    if(!email || !password || !name ){
      return res.status(400).json('Registration Failed')
    }
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
              .returning('*')
              .insert({
                email: loginEmail[0].email,
                name: name,
                joined: new Date()
              })
              .then(user => res.json(user[0]))
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('Registration Failed'))
})

app.get('/profile/:id', (req,res) =>{
    const {id} = req.params;
    
    db('users').select('*').where({id})
      .then(user =>{
        if(user.length){
          res.json(user[0]);
        }else {
          res.status(400).json('USER NOT FOUND')
        }
      })
      .catch(err => res.status(400).json('not found'))  
})
    



app.put('/image', (req,res)=>{
    const {id}= req.body;
    db('users').where({id})
    .increment('entries',1)
    .returning('entries')
    .then(entries =>res.json(entries[0].entries))
    .catch(err => res.status(400).json('Failed to update'))
})
app.listen(process.env.PORT || 3000,()=>{
    console.log(`listening on ${process.env.PORT}`);
})