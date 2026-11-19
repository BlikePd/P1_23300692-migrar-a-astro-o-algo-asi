import "dotenv/config"
import jwt from "jsonwebtoken"
import { ApolloServer } from "@apollo/server"
import { typeDefs } from "./graphql/schema.js"
import { resolvers } from "./resolvers/index.js"
import { setupDatabase } from "./db/setup.js"
import { pool } from "./db/connection.js"
import express from "express"
import cors from "cors"
import { expressMiddleware } from "@as-integrations/express5"
import multer from "multer"
import { fileTypeFromBuffer } from "file-type"
import { v2 as cloudinary } from "cloudinary"
import { mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { mercadoPagoWebhookRouter } from "./routes/mercadopagoWebhook.js"
import { paypalWebhookRouter } from "./routes/paypalWebhook.js"
import { createServer } from "node:http"
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer"
import { makeExecutableSchema } from "@graphql-tools/schema"
import { WebSocketServer } from "ws"
import { useServer } from "graphql-ws/use/ws"
import { iniciarEventosBackoffice } from "./graphql/backofficeEvents.js"

const port = Number(process.env.PORT) || 4000
const app = express()
const httpServer = createServer(app)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

app.use("/webhooks", mercadoPagoWebhookRouter)
app.use("/webhooks", paypalWebhookRouter)

const uploadsDir = fileURLToPath(
  new URL("../uploads/", import.meta.url)
)

mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },

  fileFilter: (req, file, cb) => {
    const permitidos = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ]

    if (!permitidos.includes(file.mimetype)) {
      return cb(
        new Error(
          "Selecciona una imagen JPG, PNG o WebP"
        )
      )
    }

    cb(null, true)
  }
})

const requireUploadAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || ""

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      mensaje: "Debes iniciar sesión"
    })
  }

  let usuario

  try {
    usuario = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET
    )
  } catch {
    return res.status(401).json({
      mensaje: "Sesión inválida o vencida"
    })
  }

  if (usuario.rol !== "ADMIN") {
    return res.status(403).json({
      mensaje: "Se requiere ser administrador"
    })
  }

  next()
}

const subirImagenCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "quest-merchant/productos",
        resource_type: "image",
        overwrite: false,
        unique_filename: true
      },

      (error, resultado) => {
        if (error) {
          return reject(error)
        }

        if (!resultado?.secure_url) {
          return reject(
            new Error(
              "Cloudinary no devolvió una URL válida"
            )
          )
        }

        resolve(resultado)
      }
    )

    stream.on("error", reject)

    stream.end(buffer)
  })
}

try {

  await setupDatabase()
  await pool.query("SELECT 1")
  await iniciarEventosBackoffice()

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  })
  
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/subscriptions"
  })

  const wsCleanup = useServer(
    {
      schema,

      context: async (ctx) => {
        const authorization =
          ctx.connectionParams?.authorization

        const token =
          typeof authorization === "string" &&
          authorization.startsWith("Bearer ")
            ? authorization.slice(7)
            : null

        if (!token) {
          return {
            usuario: null,
            token: null
          }
        }

        try {
          const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
          )

          return {
            usuario,
            token
          }

        } catch (error) {
          console.warn(
            "Conexión WebSocket con token inválido"
          )

          return {
            usuario: null,
            token: null
          }
        }
      }
    },
    wsServer
  )

  const server = new ApolloServer({
    schema,

    plugins: [

      ApolloServerPluginDrainHttpServer({
        httpServer
      }),

      {
        async serverWillStart() {
          return {
            async drainServer() {
              await wsCleanup.dispose()
            }
          }
        }
      }
    ]
  })

  await server.start()

  app.use("/uploads", cors())

  app.post(
    "/uploads",
    requireUploadAdmin,
    upload.single("imagen"),

    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          mensaje: "Selecciona una imagen"
        })
      }

      try {

        const tipo = await fileTypeFromBuffer(
          req.file.buffer
        )

        const permitidos = [
          "image/jpeg",
          "image/png",
          "image/webp"
        ]

        if (!tipo || !permitidos.includes(tipo.mime)) {
          return res.status(400).json({
            mensaje: "Formato de imagen inválido"
          })
        }

        if (
          !process.env.CLOUDINARY_CLOUD_NAME ||
          !process.env.CLOUDINARY_API_KEY ||
          !process.env.CLOUDINARY_API_SECRET
        ) {
          console.error(
            "Faltan variables de entorno de Cloudinary"
          )

          return res.status(500).json({
            mensaje:
              "El almacenamiento de imágenes no está configurado"
          })
        }

        const resultado = await subirImagenCloudinary(
          req.file.buffer
        )

        const imagenUrl = resultado.secure_url

        console.log(
          "Imagen subida correctamente:",
          resultado.public_id
        )

        return res.status(201).json({
          imagen: imagenUrl
        })

      } catch (error) {
        console.error(
          "Error al subir imagen a Cloudinary:",
          error
        )

        return res.status(502).json({
          mensaje:
            "No se pudo guardar la imagen en Cloudinary"
        })
      }
    }
  )

  app.use(
    "/uploads",
    express.static(uploadsDir)
  )

  app.use("/uploads", (error, req, res, next) => {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        mensaje: "La imagen supera los 5 MB"
      })
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        mensaje:
          "La subida debe contener una sola imagen válida"
      })
    }

    if (
      error.message ===
      "Selecciona una imagen JPG, PNG o WebP"
    ) {
      return res.status(400).json({
        mensaje: error.message
      })
    }

    console.error(
      "Error procesando la imagen:",
      error
    )

    return res.status(500).json({
      mensaje: "No se pudo procesar la imagen"
    })
  })

  app.use(
    "/",
    cors(),
    express.json(),

    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader =
          req.headers.authorization || ""

        if (!authHeader.startsWith("Bearer ")) {
          return { usuario: null }
        }

        const token = authHeader.slice(7)

        try {
          const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
          )

          return { usuario }

        } catch {
          return { usuario: null }
        }
      }
    })
  )

  httpServer.listen(port, () => {
    console.log(
      `Quest Merchant GraphQL: http://localhost:${port}/`
    )

    console.log(
      `GraphQL Subscriptions: ws://localhost:${port}/subscriptions`
    )

    console.log(
      `Webhook Mercado Pago: http://localhost:${port}/webhooks/mercadopago`
    )

    console.log(
      `Webhook PayPal: http://localhost:${port}/webhooks/paypal`
    )

    console.log(
      "Sistema de imágenes: Cloudinary"
    )

    console.log(
      "BackOffice en tiempo real: inicializado"
    )
  })

} catch (error) {
  console.error(
    "Error al iniciar Quest Merchant:",
    error
  )

  process.exit(1)
}
