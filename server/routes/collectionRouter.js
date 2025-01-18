import express from "express"
import Discogs from "../server.js"

const collectionRouter = express.Router()

collectionRouter.get("/", async (req, res) => {
    try {
        const collection = await Discogs.user().collection()
        collection.getReleases(process.env.USER_NAME, 0, {}, (err, rel) => {
            console.log(rel)

            res.status(200).json({
                success: true,
                data: rel
            })
        })
    } catch (err) {
        console.error(err)

        res.status(500).json({
            success: false,
            message: "server error"
        })
    }
})

export default collectionRouter