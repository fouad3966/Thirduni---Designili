import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import dalleRoutes from './route/dalle.routes.js'


dotenv.config();

const app=express();
app.use(cors());
app.use(express.json({limit:"16kb"}))

app.use('/api/v1/dalle',dalleRoutes)
app.get('/',(req,res)=>{
    res.status(200).json({message:"Shirt image generation backend"})
})

const port = Number(process.env.PORT) || 8080;
app.listen(port,()=>console.log(`Server has started on port ${port}`))
