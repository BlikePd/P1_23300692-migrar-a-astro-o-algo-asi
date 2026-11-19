import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { pool } from "../db/connection.js"
import { mapUsuario } from "./helpers.js"
import { randomBytes, createHash } from "node:crypto"
import nodemailer from "nodemailer"

export const authMutations = {  
    solicitarRecuperacionPassword: async (_, { email }) => {
        const correo = typeof email === "string" ? email.trim().toLowerCase() : ""

        if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            throw new Error("Introduce un correo electrónico válido")
        }

        const smtpUser = process.env.SMTP_USER
        const smtpPassword = process.env.SMTP_PASSWORD
        const frontendUrl = process.env.FRONTEND_URL

        if (!smtpUser || !smtpPassword || !frontendUrl) {
            throw new Error("El servicio de recuperación no está configurado")
        }

        const usuarioResult = await pool.query(
            "SELECT id, nombre FROM usuario WHERE LOWER(email) = $1 AND activo = TRUE",
            [correo]
        )

        if (!usuarioResult.rowCount) return true

        const usuario = usuarioResult.rows[0]

        const recientes = await pool.query(
            `SELECT id FROM recuperacion_password
            WHERE usuario_id = $1 AND creado_en > NOW() - INTERVAL '2 minutes'
            LIMIT 1`,
            [usuario.id]
        )

        if (recientes.rowCount) return true

        const token = randomBytes(32).toString("hex")
        const tokenHash = createHash("sha256").update(token).digest("hex")
        const enlace = new URL("/restablecer-contrasena", frontendUrl)
        enlace.searchParams.set("token", token)

        const insercion = await pool.query(
            `INSERT INTO recuperacion_password (usuario_id, token_hash, expira_en)
            VALUES ($1, $2, NOW() + INTERVAL '30 minutes')
            RETURNING id`,
            [usuario.id, tokenHash]
        )

        const puerto = Number(process.env.SMTP_PORT || 465)
        const transporte = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: puerto,
            secure: puerto === 465,
            auth: {
                user: smtpUser,
                pass: smtpPassword
            }
        })

        try {
            await transporte.sendMail({
                from: process.env.SMTP_FROM || `"Quest Merchant" <${smtpUser}>`,
                to: correo,
                subject: "Recupera tu contraseña de Quest Merchant",
                text: `Hola ${usuario.nombre},

            Para cambiar tu contraseña, abre este enlace:
            ${enlace.href}

            El enlace vence en 30 minutos y solo funciona una vez.
            Si no solicitaste este cambio, ignora este correo.`
            })
        } catch (error) {
            await pool.query(
                "DELETE FROM recuperacion_password WHERE id = $1",
                [insercion.rows[0].id]
            )

            console.error("Error de envío de recuperación:", error)
        }

        return true
    },

    restablecerPassword: async (_, { token, nuevaPassword }) => {
        if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
            throw new Error("El enlace es inválido o ha expirado")
        }

        if (
            typeof nuevaPassword !== "string" ||
            nuevaPassword.length < 8 ||
            nuevaPassword.length > 128
        ) {
            throw new Error("La contraseña debe tener entre 8 y 128 caracteres")
        }

        const tokenHash = createHash("sha256").update(token).digest("hex")
        const cliente = await pool.connect()

        try {
            await cliente.query("BEGIN")

            const resultado = await cliente.query(
                `SELECT r.usuario_id
                FROM recuperacion_password r
                JOIN usuario u ON u.id = r.usuario_id
                WHERE r.token_hash = $1
                AND r.expira_en > NOW()
                AND r.usado_en IS NULL
                AND u.activo = TRUE
                FOR UPDATE OF r`,
                [tokenHash]
            )

            if (!resultado.rowCount) {
                throw new Error("El enlace es inválido, expiró o ya fue utilizado")
            }

            const usuarioId = resultado.rows[0].usuario_id
            const hash = await bcrypt.hash(nuevaPassword, 12)

            await cliente.query(
                "UPDATE usuario SET password = $1 WHERE id = $2",
                [hash, usuarioId]
            )

            await cliente.query(
                "DELETE FROM recuperacion_password WHERE usuario_id = $1",
                [usuarioId]
            )

            await cliente.query("COMMIT")
            return true
        } catch (error) {
            await cliente.query("ROLLBACK")
            throw error
        } finally {
            cliente.release()
        }
    },


    login: async (_, { email, password }) => {
            const result = await pool.query(
                "SELECT id, nombre, email, password, rol, activo FROM usuario WHERE LOWER(email) = LOWER($1)",
                [email.trim()]
            )

            const usuario = result.rows[0]

            if (!usuario) {
                return {
                    ok: false,
                    mensaje: "Correo o contraseña incorrectos",
                    usuario: null,
                    token: null
                }
            }

            if (!usuario.activo) {
                return {
                    ok: false,
                    mensaje: "El usuario está desactivado",
                    usuario: null,
                    token: null
                }
            }

            let passwordValida = false

            if (usuario.password.startsWith("$2")) {
                passwordValida = await bcrypt.compare(password, usuario.password)
            } else {
                passwordValida = password === usuario.password

                if (passwordValida) {
                    const hash = await bcrypt.hash(password, 10)

                    await pool.query(
                        "UPDATE usuario SET password = $1 WHERE id = $2",
                        [hash, usuario.id]
                    )
                }
            }

            if (!passwordValida) {
                return {
                    ok: false,
                    mensaje: "Correo o contraseña incorrectos",
                    usuario: null,
                    token: null
                }
            }

            const token = jwt.sign(
                {
                    id: usuario.id,
                    rol: usuario.rol
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "8h"
                }
            )

            return {
                ok: true,
                mensaje: "Acceso correcto",
                usuario: mapUsuario(usuario),
                token
            }
        },

    registrarUsuario: async (_, { datos }) => {
        const existente = await pool.query(
            "SELECT id FROM usuario WHERE LOWER(email) = LOWER($1)",
            [datos.email.trim()]
        )

        if (existente.rowCount > 0) {
            throw new Error("Ya existe una cuenta con ese correo")
        }

        const passwordHash = await bcrypt.hash(datos.password, 10)

        const result = await pool.query(
            `INSERT INTO usuario (
                nombre,
                email,
                password,
                rol,
                activo
            )
            VALUES ($1, $2, $3, 'CLIENTE', TRUE)
            RETURNING id, nombre, email, rol, activo`,
            [
                datos.nombre.trim(),
                datos.email.trim(),
                passwordHash
            ]
        )

        const usuario = result.rows[0]

        const token = jwt.sign(
            {
                id: usuario.id,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        )

        return {
            ok: true,
            mensaje: "Cuenta creada correctamente",
            usuario: mapUsuario(usuario),
            token
        }
    },

}