const express = require('express')
const mongoose = require('mongoose');

const app = express()
const PORT = 3000

app.get('/', (req, res) => {
  console.log('Received a request at /')  
  res.send('Hello World!')
})

const MONGO_URI = `mongodb://${MONGO_USER}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('the connection to MongoDB was successful');
    app.listen(PORT, () => console.log(`the server is running on port: ${PORT}`));
  })
  .catch(err => console.error('connection error to the database:', err));
app.listen(PORT, () => {
  console.log(`the server runs on port:${PORT}`);
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
