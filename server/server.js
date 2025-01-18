import express from "express"
import collectionRouter from "./routes/collectionRouter.js"
import dotenv from 'dotenv'
import discogs from "disconnect"

dotenv.config()

const app = express()

const { Client } = discogs
const Discogs = new Client(process.env.USER_NAME, { userToken: process.env.USER_TOKEN })


app.use(express.json())
app.use("/collection", collectionRouter)

app.listen(process.env.PORT, () => {
    console.log(`server started at http://localhost:${process.env.PORT}`)
})

export default Discogs