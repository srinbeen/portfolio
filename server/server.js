import express from "express"
import collectionRouter from "./routes/collectionRouter.js"
import dotenv from 'dotenv'
import discogs from "disconnect"

import path from 'path'

dotenv.config()

const app = express()

const { Client } = discogs
const Discogs = new Client(process.env.USER_NAME, { userToken: process.env.USER_TOKEN })


app.use(express.json())
app.use("/collection", collectionRouter)

app.use(express.static(path.join(__dirname, '../client/dist')))

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'))    
})

app.listen(process.env.PORT, () => {
    console.log(`server started at port ${process.env.PORT}`)
})

export default Discogs