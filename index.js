const express = require("express");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const path = require("path");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");

const cookieParser = require("cookie-parser");
const session = require("express-session");

const database = require("./config/database");

const systemConfig = require("./config/system");

const routeAdmin = require("./routes/admin/index.route");
const route = require("./routes/client/index.route");

const flash = require("express-flash");
const moment = require("moment");
database.connect();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT;

app.use(methodOverride("_method"));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.set("views", `${__dirname}/views`);
app.set("view engine", "pug");

//tinyMCE
app.use(
  "/tinymce",
  express.static(path.join(__dirname, "node_modules", "tinymce")),
);
// end tinyMCE
//flash thông báo
app.use(cookieParser("lam231204"));
app.use(session({ cookie: { maxAge: 60000 } }));
app.use(flash());
//end flash thông báo

// App Locals Varibles
app.locals.prefixAdmin = systemConfig.prefixAdmin;
app.locals.moment = moment;
app.locals.formatTime = (date) => {
  if (!date) return '';
  const d = moment(date);
  const now = moment();
  const isToday = d.isSame(now, 'day');
  return isToday ? d.format('HH:mm') : d.format('DD/MM HH:mm');
};
app.use(express.static(`${__dirname}/public`));

// routes
route(app);
routeAdmin(app);

app.get("*", (req, res) => {
  res.render("client/pages/errors/404", {
    pageTitle: "404 Not Found",
  });
});

// Socket.io
const socketHandler = require("./socket");
socketHandler(io);

// chạy local
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });
}
module.exports = app;
// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });
