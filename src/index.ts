

import express, {Request, Response} from 'express'
import cors from 'cors'

const app = express()
const PORT = 8000


const allowedOrigins = [
  'http://localhost:8000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json())

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello World' })
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})