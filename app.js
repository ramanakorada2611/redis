const express = require("express");
const path = require("path");
const logger = require("morgan");
const redis = require("redis");
const bodyParser = require("body-parser");

const app = express();

// Create Redis client
const client = redis.createClient();

client.on('connect', () => {
    console.log("Redis server connected");
});

client.on('error', (err) => {
    console.error('Redis client error:', err);
});

// Explicitly connect the Redis client
(async () => {
    try {
        await client.connect(); // Ensure Redis client is connected before usage
        console.log("Redis client connected");
    } catch (err) {
        console.error("Error connecting to Redis:", err);
    }
})();

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', async (req, res) => {
    const title = "Task List";
    try {
        const tasks = await client.lRange('task', 0, -1); 
        const call = await client.hGetAll('call')
        res.render('index', {
            title: title,
            tasks: tasks,
            call:call
        });
    } catch (error) {
        console.error("Error fetching tasks from Redis:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/task/add',async(req,res)=>{
    try {
        const taskName = req.body.textName
        // console.log("dddddd",taskName)
        const data = await client.rPush('task',taskName)
        console.log("task name added", data)
        res.redirect('/')
    } catch (error) {
        console.error("Error while entering tasks from client side:", error);
    } 
})

app.post('/task/delete', async (req, res) => {
    try {
        const tasksToDelete = Array.isArray(req.body.task) 
            ? req.body.task.map(task => task.trim()) 
            : [req.body.task.trim()];

        const list = await client.lRange('task', 0, -1); 

        // Iterate over the tasks to delete
        for (const task of tasksToDelete) {
            if (list.includes(task)) {
                const removedCount = await client.lRem('task', 0, task);
                console.log(`Removed ${removedCount} occurrence(s) of task: ${task}`);
            } else {
                console.log(`Task "${task}" not found in the list.`);
            }
        }
        res.redirect('/');
    } catch (error) {
        console.error("Error while removing tasks from client side:", error);
        res.status(500).send("Failed to remove task(s).");
    }
});
app.post('/call/add', async (req, res) => {
    try {
        const {name,company,phone,time} = req.body
        const setData = await client.hSet('call',['name',name,'company',company,'phone',phone,'time',time])
        console.log("set",setData)
        res.redirect('/');
    } catch (error) {
        console.error("Error while setting tasks from client side:", error);
        res.status(500).send("Failed to remove task(s).");
    }
});



// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
