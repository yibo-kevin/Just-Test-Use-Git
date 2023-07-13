let ws = null;
const getWs = (url) => {
    if(!ws){
        ws = new WebSocket(url)
    }
    return ws
}
let message = new Map(); // 存储该实例的所有接口

export default class Ws {
    url = undefined;
    onmessageCallback = undefined
    socket = undefined
    setIntervalWebsocket = undefined
    sendDatas = undefined
    count = 0
    constructor(url, onmessageCallback){
        this.url = url
        this.message = message
        this.onmessageCallback = onmessageCallback.bind(this)
        this.onopen = this.onopen.bind(this)
        this.onmessage = this.onmessage.bind(this)
        this.onclose = this.onclose.bind(this)
        this.onerror = this.onerror.bind(this)
        this.createSocket = this.createSocket.bind(this)
        this.connecting = this.connecting.bind(this)
        this.sendMsg = this.sendMsg.bind(this)
        this.sendPing = this.sendPing.bind(this)
        this.reconnection = this.reconnection.bind(this)
        this.createSocket()
    }
    /**
     * 创建ws
     */
    createSocket(){
        this.socket && this.socket.close()
        if(!this.socket){
            this.socket = getWs(this.url)
            this.socket.onopen = this.onopen
            this.socket.onmessage = this.onmessage
            this.socket.onerror = this.onerror
            this.socket.onclose = this.onclose
        }else{
            console.log("websocket已连接");
        }
    }
    /**
     * 监听连接成功事件
     */
    onopen(){
        console.log("连接成功");
        if(!this.sendDatas && this.message.size > 0){
            this.message.forEach(v => {
                this.sendMsg(v) // 当有请求数据时进行重发
            })
        }
        this.sendPing(this.sendDatas)
    }
    /**
     * 发送数据但连接未建立时进行处理等待重发
     * @param {*} message 需要发送的数据
     */
    connecting(message){
        setTimeout(() => {
           if(this.socket.readyState === this.socket.CONNECTING){
               this.connecting(message)
           } else {
               if(this.socket.readyState === this.socket.OPEN){
                   this.socket.send(JSON.stringify(message))
               }
           }
        }, 5000);
    }
    /**
     * 发送消息
     */
    sendMsg(message){
        message?.apiUrl && this.message.set(message.apiUrl, message) // 存储接口信息，断线重连时调用
        if(this.socket.readyState === this.socket.OPEN){
            this.socket.send(JSON.stringify(message))
        }else{
            this.connecting(message)
        }
    }
    /**
     * 监听接收事件
     */
    onmessage(e){
        const jsonStr = e.data
        this.sendDatas = Object.keys(JSON.parse(jsonStr))[0]
        this.onmessageCallback(e.data)
    }
    /**
     * 连接失败, 重连
     */
    onerror(){
        this.socket && this.socket.close()
        clearInterval(this.setIntervalWebsocket)
        if(this.socket.readyState !== this.socket.CLOSED){
            this.reconnection()
        }
        console.log("连接失败");
    }
    /**
     * 关闭连接 重连
     * this.socket.readyState === this.socket.CLOSED时调用
     */
    onClose(e){
        this.count++
        if(this.count < 2){
            alert(e.reason || '未知错误')
        }
        clearInterval(this.setIntervalWebsocket)
        console.log("连接关闭");
        this.reconnection()
    }
    /**
     * 重连
     */
    reconnection(time = 15 * 1000){
        this.setIntervalWebsocket = setInterval(() => {
            this.socket = ws = null
            this.createSocket()
        }, time)
    }
    /**
     * 发送心跳
     */
    sendPing(time = 15 * 1000, ping = 'ping'){
        if(![this.socket.CLOSED, this.socket.CLOSING].includes(this.socket.readyState)){
            clearInterval(this.setIntervalWebsocket)
            const datas = `{"type":"heartbeat", "apiUrl":"${ping}","isEnable":true}`
            this.socket && this.socket.send(datas)
            this.setIntervalWebsocket = setInterval(() => {
                this.socket && this.socket.send(datas)
            }, time)
        }
    }
}
