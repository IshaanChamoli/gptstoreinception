import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { prettyJSON } from 'hono/pretty-json'
import { cors } from 'hono/cors'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

const app = new OpenAPIHono()

// Middleware
app.use('*', cors())
app.use('*', prettyJSON())

// Schema definition
const urlQuerySchema = createRoute({
  method: 'POST',
  path: '/query-url',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            url: z.string().url(),
            parameters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            url: z.string(),
            response: z.string()
          })
        }
      },
      description: 'Successful response'
    }
  },
  tags: ['url'],
  description: 'Make a request to a URL with query parameters'
})

app.openapi(urlQuerySchema, async (c) => {
  const { url, parameters = {} } = await c.req.json()

  try {
    const urlObj = new URL(url)
    Object.entries(parameters).forEach(([key, value]) => {
      urlObj.searchParams.append(key, value)
    })

    const finalUrl = urlObj.toString()
    const response = await fetch(finalUrl)
    const htmlText = await response.text()
    
    const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : htmlText
    
    return c.json({
      url: finalUrl,
      response: bodyContent
    })
  } catch (error) {
    return c.json({ error: `Failed to make request: ${error.message}` }, 400)
  }
})

// OpenAPI documentation
app.doc('/documentation', {
  openapi: '3.0.0',
  info: {
    title: 'URL Query API',
    description: 'API that forwards requests with query parameters',
    version: '0.1.0'
  }
})

if (process.env.npm_lifecycle_event === 'dev') {
    serve({
      fetch: app.fetch,
      port: 3000,
    }, (info) => {
      console.log(`Listening on http://localhost:${info.port}`)
    })
  }
  

export default app