import { Elysia, t } from 'elysia'

new Elysia()
  .get('/hello', () => 'Hello World')
  .get('/dos', () => 'This should be safe', {
    query: t.Record(t.String(), t.String())
  })
  .listen(3000)

console.log("Server listening on http://localhost:3000")
