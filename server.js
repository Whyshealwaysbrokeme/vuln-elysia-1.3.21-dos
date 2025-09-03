import { Elysia } from 'elysia'
import { createRequire } from 'module'
import http from 'http'

global.__REQ = createRequire(import.meta.url)

let userControlled = '""'

function buildHandler(injectedCode) {
  console.log('[*] Building handler with payload:\n', injectedCode)
  const fnLiteral = `
    return (function(c){
      c.body = ${injectedCode};
      return c;
    })
  `
  return Function('"use strict";\n' + fnLiteral)()
}

let handler = buildHandler(userControlled)

const app = new Elysia()
  .post('/config', async ({ request }) => {
    const payload = await request.text()
    console.log("[*] /config got payload:", payload)
    userControlled = payload
    handler = buildHandler(userControlled)
    return { msg: 'config updated' }
  })
  .post('/register', ({ body }) => handler({ body }))

http.createServer(async (req, res) => {
  const url = `http://${req.headers.host}${req.url}`
  const body = req.method === 'GET' ? undefined : req
  const fetchReq = new Request(url, {
    method: req.method,
    headers: req.headers,
    body,
    duplex: "half"
  })

  try {
    const response = await app.fetch(fetchReq)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    const buf = Buffer.from(await response.arrayBuffer())
    res.end(buf)
  } catch (err) {
    console.error("Handler error:", err)
    res.statusCode = 500
    res.end("Internal Server Error")
  }
}).listen(3000, () => {
  console.log("Listening on http://localhost:3000")
})
