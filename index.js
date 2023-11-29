const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
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
    
    //jwt related api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_ACCESS, {expiresIn: '1h'});
      res.send({token});
    })
    //user
    app.get('/users', async(req,res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })
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

    //user adm
    app.patch('/users/admin/:id', async(req, res)=>{
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

    //user delete
    app.delete('/users/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    //get teacher application
    app.get('/application', async(req, res)=>{
      const cursor = applicationCollection.find(req.body);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/application', async(req, res)=>{
      const result = await applicationCollection.insertOne(req.body);
      res.send(result);
    })

    ///delete
    app.delete('/application/:id', async(req, res)=>{
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