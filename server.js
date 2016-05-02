const express = require('express')
  , path = require('path');


var app = express();

app.use(express.static( path.join(__dirname, 'frontend')) );
app.get('/file/:name', (req, res) => {
  res.sendFile(path.join(__dirname, 'LFS', req.params.name));
});

app.all('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
})

app.listen('3030', () => {
  console.log('Server Listening at port 3030');
})
