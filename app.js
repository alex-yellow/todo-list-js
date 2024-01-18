const express = require('express');
const db = require('./db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/task');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const flash = require('express-flash');
const bcrypt = require('bcrypt');
const handlebars = expressHandlebars.create({
  defaultLayout: 'main',
  extname: 'hbs',
});

const app = express();
app.use(express.urlencoded({ extended: true }));
app.engine('hbs', handlebars.engine);
app.set('view engine', 'hbs');
app.use(express.static('public'));

app.use(
  session({
    secret: 'key',
    resave: false,
    saveUninitialized: false,
  })
);

// Используем express-flash
app.use(flash());

// Добавляем middleware для передачи флеш-сообщений в res.locals
app.use((req, res, next) => {
  res.locals.success_messages = req.flash('success');
  next();
});

// Функция для проверки аутентификации пользователя
function checkUserAuthentication(req, res, next) {
  const user = req.session.user;

  if (!user) {
    return res.redirect('/login');
  }

  req.user = user;
  next();
}

app.use('/', authRoutes); 
app.use(checkUserAuthentication); 
app.use('/', taskRoutes); 



app.listen(3000, function () {
  console.log('Server is running on port 3000');
});