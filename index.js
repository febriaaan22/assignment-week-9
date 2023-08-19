const express = require('express')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
// const redis = require('ioredis')
require('dotenv').config()

const app = express()

const commonResponse = function (data, error) {
    if (error) {
        return {
            success: false,
            error: error
        }
    }

    return {
        success: true,
        data: data
    }
}

// const redisCon = new redis ({
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT
// })

// const mysqlCon2 = mysql.createConnection({
//     host: process.env.MYSQL_HOST,
//     port: process.env.MYSQL_PORT,
//     user: process.env.MYSQL_USER,
//     password: process.env.MYSQL_PASS,
//     database: process.env.MYSQL_DB
// })
//

const mysqlCon = mysql.createConnection({
    host: process.env.RAILWAY_HOST,
    port: parseInt(process.env.RAILWAY_PORT),
    user: process.env.RAILWAY_USER,
    password: process.env.RAILWAY_PASS,
    database: process.env.RAILWAY_DB
})

const query = (query, values) => {
    return new Promise((resolve, reject) => {
        mysqlCon.query(query, values, (err, result, fields) => {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

mysqlCon.connect((err) => {
    if (err) {
        console.log("database error", err)
        return
    }
    console.log("mysql successfully connected")
})

app.use(bodyParser.json())

app.get('/user', (request, response) => {
    mysqlCon.query("select * from users", (err, result, fields) => {
        if (err) {
            console.error(err)
            response.status(401).json(commonResponse(null, "server error"))
            response.end()
            return
        }

        response.status(301).json(commonResponse(result, null))
        response.end()
    })
})

app.get('/user/:id', async (request, response) => {
try {
    const id = request.params.id
    const dbData = await query (
        `SELECT u.id , u.name , u.address, (
            SELECT Sum(t.amount) - 
                (SELECT Sum(t.amount)
                FROM transaction as t 
                WHERE t.type = 'expense' and t.user_id = ?)
            FROM transaction as t 
            WHERE t.type = 'income' and t.user_id = ?
        ) as balance, (
            SELECT SUM(t.amount)
            FROM transaction as t
            WHERE t.type = 'expense' and t.user_id = ?
        ) as expense
        FROM users as u, transaction as t 
        WHERE u.id = ?
        GROUP BY u.name`,[id, id, id, id] )

    response.status(301).json(commonResponse(dbData[0], null))
    response.end()
} catch (err) {
    console.error(err)
    response.status(401).json(commonResponse(null, "server error"))
    response.end()
    return
    }
})

app.post('/transaction', async (request, response) => {
    try {
        const body = request.body

        const dbData = await query(`insert into transaction 
        (user_id, type, amount) values (?, ?, ?)`,
        [body.user_id, body.type, body.amount])

        response.status(301).json(commonResponse({
            id: dbData.insertId,
            message: "berhasil"
        }, null))
        response.end()
        console.log(dbData)

    } catch (err) {
        console.error(err)
        response.status(401).json(commonResponse(null, "server error"))
        response.end()
        return
    }
})

app.put('/transaction/:id', async (request, response) => {
    try {
        const body = request.body

        const dbData = await query(`UPDATE transaction
        SET user_id=?, type=?, amount=?
        WHERE id=?;`,
        [body.user_id, body.type, body.amount, request.params.id])

        response.status(301).json(commonResponse({
            id: request.params.id
        }, null))
        response.end()

    } catch (err) {
        console.error(err)
        response.status(401).json(commonResponse(null, "server error"))
        response.end()
        return
    }
})

app.delete('/transaction/:id', async (request, response) => {
    try {
        const id = request.params.id
        console.log("delete")
        const data = await query("select user_id from transaction where id = ?", id)
        if (Object.keys(data).length === 0) {
            response.status(401).json(commonResponse(null, "data not found"))
            response.end()
            return
        }
        await query("delete from transaction where id = ?", id)
        response.status(301).json(commonResponse({
            id: id
        }))
        console.log('Data is Deleted')
        response.end()

    } catch (err) {
        console.error(err)
        response.status(401).json(commonResponse(null, "server error"))
        response.end()
        return
    }
})

app.listen(1688, () => {
    console.log("Server Running in 1688")
})