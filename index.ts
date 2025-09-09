import  express  from "express";
import { orderBookSchema } from "./types";
import { orderbook, BookWithQuantity } from "./orderbook";

const app = express()
app.use(express.json())

const BASE_ASSET = 'BTC'
const QUOTE_ASSET = 'USD'
let GLOBAL_TRADE_ID = 0

app.post('/api/v1/order',(req,res)=>{

    const order = orderBookSchema.safeParse(req.body)
    if(order.error){
        res.status(400).send(order.error.message)
        return
    }

    const {baseAsset,quoteAsset, price,quantity,side,type,kind} = order.data
    const orderId = crypto.randomUUID()

    if(baseAsset !== BASE_ASSET || quoteAsset !== quoteAsset){
        res.status(400).send('Invalid base or quote asset')
        return
    }

    const {executedQty, fills} = fillOrder(orderId,price,quantity,side,kind)

    res.status(200).send({
        orderId,
        executedQty,
        fills
    })

})

app.listen('3000')


const fillOrder = (orderId:string,price:number,quantity:number,side:'buy' | 'sell', type?:'ioc'):{status:'accepted'|'rejected';executedQty:number; fills:Fill[] } =>{
    const fills:Fill[] = []
    const maxFillingQty = getFillAmount(price,quantity,side)
    let executedQty = 0


    if(type === 'ioc' && maxFillingQty<quantity){
        return {
            status:'rejected',
            executedQty:maxFillingQty,
            fills:[]
        }
    }

    return {
        status:'accepted',
        executedQty,
        fills
    }

}

const getFillAmount = (price:number,quantity:number,side:'buy'| 'sell'):number =>{
    let filled = 0
    return filled
}

interface Fill {
    price:number;
    qty:number;
    tradeId:number;
}