const fastify = require('fastify')({ 
  logger: true,
  trustProxy: true // Add this for Vercel
})
const fetch = require('node-fetch')

async function buildServer() {
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'URL Query API',
        description: 'API that forwards requests with query parameters',
        version: '0.1.0'
      },
      servers: [{
        url: 'http://localhost:3000'
      }]
    }
  return fastify;
  })

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/documentation'
  })

  // Define the schema for the request
  const urlQuerySchema = {
    schema: {
      description: 'Make a request to a URL with query parameters',
      tags: ['url'],
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { 
            type: 'string',
            format: 'uri',
            description: 'The base URL to call'
          },
          parameters: {
            type: 'object',
            additionalProperties: {
              type: ['string', 'number', 'boolean'],
            },
            description: 'Key-value pairs for query parameters'
          }
        }
      },
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            url: { type: 'string' },
            response: { 
              type: 'string',
              additionalProperties: true
            }
          }
        },
        400: {
          description: 'Bad Request',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }

  // Define the route
  fastify.post('/query-url', urlQuerySchema, async (request, reply) => {
    const { url, parameters = {} } = request.body

    try {
      // Construct URL with query parameters
      const urlObj = new URL(url)
      Object.entries(parameters).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value)
      })

      const finalUrl = urlObj.toString()
      
      // Make the request
      const response = await fetch(finalUrl)
      const htmlText = await response.text()
      
      // Extract body content using regex
      const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      const bodyContent = bodyMatch ? bodyMatch[1] : htmlText

      
      return {
        url: finalUrl,
        response: bodyContent
      }
    } catch (error) {
      reply.status(400)
      return {
        error: `Failed to make request: ${error.message}`
      }
    }
  })

  return fastify
}

// Start the server
const start = async () => {
  try {
    const server = await buildServer()
    await server.ready()
    await server.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()