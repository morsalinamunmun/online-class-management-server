const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddlqajr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const userCollection = client.db("classManagement").collection("users");
    const applicationCollection = client.db("classManagement").collection("teacherRequest");
    const classCollection = client.db("classManagement").collection("classes");
    
    //jwt related api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_ACCESS, {expiresIn: '1h'});
      res.send({token});
    })

    //middlewares
    const verifyToken = (req, res, next) =>{
      //console.log("inside verify", req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.TOKEN_ACCESS, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
      })
    }

     //admin verify
     const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }

    //teacher verify
    const verifyTeacher = async(req, res, next)=>{
      const email = req.decoded.email;
      const query ={email: email};
      const user = await applicationCollection.findOne(query);
      const isTeacher = user?.role === 'teacher';
      if(isTeacher){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }

    //user
    app.get('/users', verifyToken, async(req,res)=>{
      //console.log(req.headers)
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    //get admin
    app.get('/users/admin/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    //user already
    app.post('/users', async(req, res) =>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'user Already add', insertedId: null})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    //user to admin
    app.patch('/users/admin/:id',verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //add class
    app.post('/classes', verifyToken, verifyTeacher, async (req, res) => {
      const result = await classCollection.insertOne(req.body);
      res.send(result);
    })

    //get class
    app.get('/classes', async(req, res)=>{
      const cursor = classCollection.find(req.body);
      const result = await cursor.toArray();
      res.send(result);
    })

    //add class get one
    app.get('/classes/:email', async(req, res)=>{
      const email = req.params.email;
      const result = await classCollection.findOne({ email: email });
      res.send(result);
    })

    //class approved roll
    app.patch('/classes/item/:id', verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'accepted'
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //user delete
    app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    //get teacher application
    app.get('/teacherRequest', async(req, res)=>{
      const cursor = applicationCollection.find(req.body);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/teacherRequest',  async(req, res)=>{
      const result = await applicationCollection.insertOne(req.body);
      res.send(result);
    })

    //make teacher
    app.patch('/teacherRequest/teacher/:id', verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'teacher'
        }
      }
      const result = await applicationCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //get teacher
    app.get('/teacherRequest/teacher/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;
      //const id = {_id: new ObjectId(req.params.id)}
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email};
      console.log(query)
      const user = await applicationCollection.findOne(query);
      let teacher = false;
      if(user){
        console.log("User found:", user);
        teacher = user?.role === 'teacher';
        console.log(teacher)
      }
      res.send({ teacher });
    })

    ///delete
    app.delete('/teacherRequest/:id', verifyToken, verifyAdmin, async(req, res)=>{
      const query = {_id: new Object(req.params.id)};
      const result = await applicationCollection.deleteOne(query);
      res.send(result);
    })
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) =>{
    res.send('online class is sitting')
})

app.listen(port, () =>{
    console.log(`online class is sitting on port ${port}`)
})