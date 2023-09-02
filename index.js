const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const crypto = require('crypto');

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser({extended: false}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const users = [];
const exercises = [];

app.get('/api/users', (_, res) => {res.json(users);})
app.post('/api/users', (req, res) => {
  const createdUser = {_id: crypto.randomUUID(), username: req.body.username};
  users.push(createdUser);
  res.json(createdUser);
});

app.post('/api/users/:userId/exercises', (req, res) => {
  const foundUser = users.find(user => user._id === req.params.userId);
  if (!foundUser) {
    return res.statusCode(404);
  }
  const createdExercise = {
    _id: crypto.randomUUID(), 
    description: req.body.description,
    duration: +req.body.duration,
    date: req.body.date ? new Date(req.body.date) : new Date(),
    userId: req.params.userId
  };
  exercises.push(createdExercise);
  const {_id, userId, ...rest} = createdExercise;
  res.json({...foundUser, ...rest, date: createdExercise.date.toDateString()});
});

app.get('/api/users/:userId/logs', (req, res) => {
  const limit = req.query.limit ? +req.query.limit : undefined;
  const from = req.query.from ? new Date(req.query.from) : undefined;
  const to = req.query.to ? new Date(req.query.to) : undefined;
  const userId = req.params.userId;

  if (!userId) {
    return res.statusCode(400);
  }

  const foundUser = users.find(user => user._id === userId);
  if (!foundUser) {
    return res.json(404);
  }

  const userExercises = exercises.filter(exercise => exercise.userId === userId);
  const mappedUserExercises = userExercises.map(exercise => ({description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString()}));

  if (!limit && !from && !to) {
    return res.json({...foundUser, count: mappedUserExercises.length, log: mappedUserExercises});
  }


  if (limit && !from && !to) {
    const limitedExercises = mappedUserExercises.slice(0, +limit);
    return res.json({...foundUser, count: limitedExercises.length, log: limitedExercises});
  }

  const dateSortedExercises = userExercises.sort((exercise1, exercise2) => exercise1.date.valueOf() - exercise2.date.valueOf());

  if (limit && from && !to) {
    const fromExercise = dateSortedExercises.find(exercise => exercise.date.getTime() >= from.getTime());
    const indexOfFrom = dateSortedExercises.indexOf(fromExercise);
    const mappedDateSortedExercises = dateSortedExercises.map(exercise => ({description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString()}));
    const limitedExercises = mappedDateSortedExercises.slice(indexOfFrom, limit + indexOfFrom);

    return res.json({...foundUser, count: limitedExercises.length, log: limitedExercises});
  } 
  

  if (limit && from && to) {
    const fromExercise = dateSortedExercises.find(exercise => exercise.date.getTime() >= from.getTime());
    const indexOfFrom = dateSortedExercises.indexOf(fromExercise);
    const limitedExercises = dateSortedExercises.slice(indexOfFrom, limit + indexOfFrom).filter(exercise => exercise.date.getTime() <= to.getTime());
    const mappedDateSortedExercises = limitedExercises.map(exercise => ({description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString()}));

    return res.json({...foundUser, count: limitedExercises.length, log: mappedDateSortedExercises});
  }

  return res.json({...foundUser, count: mappedUserExercises.length, log: mappedUserExercises});
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
