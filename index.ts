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

    if(side === 'buy'){
        const sortedAsk = orderbook.asks.sort()
        sortedAsk.forEach(o=>{
            if(o.price <= price && quantity> 0){
                const filledQuantity = Math.min(o.quantity,quantity)
                o.quantity -= filledQuantity
                BookWithQuantity.asks[o.price] = (BookWithQuantity.asks[o.price] || 0) - filledQuantity
                fills.push({
                    price:o.price,
                    qty:filledQuantity,
                    tradeId:GLOBAL_TRADE_ID
                })
                executedQty += filledQuantity
                quantity -= filledQuantity
                if(o.quantity === 0 ){
                    orderbook.asks.slice(orderbook.asks.indexOf(o),1)
                }
                if(BookWithQuantity.asks[price] === 0){
                    delete BookWithQuantity.asks[price]
                }
            }
        })

        if(quantity !== 0){
            orderbook.bids.push({
                price,
                quantity: quantity- executedQty,
                side:'bid',
                orderId
            })
        }
    }
    else {
        orderbook.bids.forEach(o=>{
            if(o.price >= price && quantity > 0){
                const filledQuantity = Math.min(o.quantity, quantity)
                o.quantity -= filledQuantity
                BookWithQuantity.bids[price] = (BookWithQuantity.bids[price] || 0) - filledQuantity
                fills.push({
                    price:o.price,
                    qty:filledQuantity,
                    tradeId:GLOBAL_TRADE_ID
                })
                executedQty += filledQuantity
                quantity -= filledQuantity
                if(o.quantity === 0){
                    orderbook.bids.slice(orderbook.bids.indexOf(o),1)
                }
                if(BookWithQuantity.bids[price] === 0){
                    delete BookWithQuantity.bids[price]
                }

            }
        })

        if(quantity !==0){
            orderbook.asks.push({
                price,
                quantity:quantity,
                side:'ask',
                orderId

            })
            BookWithQuantity.asks[price] = (BookWithQuantity.asks[price] || 0) + (quantity)
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
    if(side === 'buy'){
        orderbook.asks.forEach(o => {
            if(o.price <price){
                filled += Math.min(o.quantity, quantity)
            }
        })
    }
    else {
        orderbook.bids.forEach(o=>{
            if(o.price>price){
                filled += Math.min(o.quantity,quantity)
            }
        })
    }
    return filled
}

interface Fill {
    price:number;
    qty:number;
    tradeId:number;
}