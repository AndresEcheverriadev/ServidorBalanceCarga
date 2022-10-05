import express from "express";
import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import { FileSystem } from "./Api/FileSystem.js";
import { MesaggesSystem } from "./Api/MesaggesSystem.js";
import session from "express-session";
import MongoStore from "connect-mongo";
import { config } from "./Config/process.js";
import handlebars from "express-handlebars";
import mongoose from "mongoose";
import passport from "passport";
import initializePassport from "./Config/passport.js";
import { fork } from "child_process";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const apiMensajes = new MesaggesSystem();
const apiProductos = new FileSystem();
const app = express();
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);
const port = config.Port;
const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true };

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../public")));

initializePassport();

const connection = mongoose.connect(config.MongoURL);

app.use(
  session({
    store: MongoStore.create({
      mongoUrl: config.MongoURL,
      mongoOptions: advancedOptions,
      ttl: 3600,
    }),
    secret: config.Secret,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: false,
      secure: false,
      maxAge: 600000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.engine("handlebars", handlebars.engine());
app.set("views", path.join(__dirname, "../public/views"));
app.set("view engine", "handlebars");

app.get("/", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.redirect("/home");
});

app.get("/home", (req, res) => {
  req.session.contador++;
  res.render("vistaContenedor", { user: req.user.email });
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    res.redirect("/home");
  } else {
    res.sendFile(path.join(__dirname, "../public/login.html"));
  }
});

app.post(
  "/login",
  passport.authenticate("login", { failureRedirect: "/loginfail" }),
  async (req, res) => {
    res.redirect("/home");
  }
);

app.get("/loginfail", (req, res) => {
  res.render("vistaError", { error: "Login failed" });
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/register.html"));
});

app.post(
  "/register",
  passport.authenticate("register", { failureRedirect: "/registerfail" }),
  async (req, res) => {
    res.redirect("/home");
  }
);

app.get("/registerfail", async (req, res) => {
  res.render("vistaError", { error: "Register failed" });
});

app.get("/logout", (req, res) => {
  const email = req.session?.email;
  if (email) {
    req.session.destroy((err) => {
      if (!err) {
        res.render(path.join(__dirname, "../public/views/vistaLogout"), {
          email,
        });
      } else {
        res.redirect("/");
      }
    });
  } else {
    res.redirect("/");
  }
});

const dataInfo = {
  args: process.argv.slice(2),
  plataforma: process.platform,
  Node: process.version,
  memoria: JSON.stringify(process.memoryUsage.rss()),
  ruta: process.execPath,
  proceso: process.pid,
  carpeta: process.cwd(),
};

app.get("/info", (req, res) => {
  res.render("vistaPros", { dataInfo });
});

app.get("/randoms", (req, res) => {
  const { cantidad = 1e8 } = req.query;

  const calcCombinations = fork("./calcCombinations.js");
  calcCombinations.send(cantidad);
  calcCombinations.on("message", (combinations) => {
    res.render("vistaRandoms", { combinations });
  });
});

io.on("connection", async (socket) => {
  console.log(`Cliente conectado en ${socket.id}`);
  socket.emit("products", await apiProductos.listarProductos());
});

const server = httpServer.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});

server.on("error", (error) => {
  console.error(`Error en el servidor ${error}`);
});

console.log("args ->", process.argv.slice(2));
