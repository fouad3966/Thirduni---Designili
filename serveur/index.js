import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import dalleRoutes from './route/dalle.routes.js'
import tryOnRoutes from './route/tryon.routes.js'
import nlpRoutes from './route/nlp.routes.js'


dotenv.config();

const app=express();
app.set('trust proxy', false);
app.use(cors());
app.use(express.json({limit:"16kb"}))

app.use('/api/v1/dalle',dalleRoutes)
app.use('/api/v1/tryon',tryOnRoutes)
app.use('/api/v1/nlp',nlpRoutes)
app.get('/',(req,res)=>{
    res.status(200).json({message:"Shirt image generation backend"})
})

const port = Number(process.env.PORT) || 8080;
app.listen(port,()=>console.log(`Server has started on port ${port}`))
