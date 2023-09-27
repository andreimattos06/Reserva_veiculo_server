import { PrismaClient } from '@prisma/client'
import express from 'express'
import { createHash } from 'node:crypto'
import cors from 'cors';

const app = express()

const allowedOrigins = ['http://localhost:3000'];

const corsOptions = {
    origin: (origin, callback) => {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  };

function md5(content) {
    return createHash('md5').update(content).digest('hex')
}


const prisma = new PrismaClient({
    log: ['query']
})


app.use(cors(corsOptions));
app.use(express.json())


app.post('/login', async (request, response) => {
    const body = request.body

    if (body.email && body.senha) {
        const result = await prisma.user.findFirst({
            where: {
                email: body.email,
                senha: md5(body.senha)

            },
            select: {
                email: true,
                nome_completo: true,
                administrador: true,
                empresa: true,
            }
        })
        console.log(result)
        return response.json(result)
    }
    else {
        return response.status(401)
    }

})

app.post('/getusers', async (request, response) => {
    const body = request.body
    if (body.empresaid) {
        const result = await prisma.user.findMany({
            where: {
                empresa: {
                    some: {
                        id: Number(body.empresaid)
                    }
                }
            },
            select: {
                id: true,
                email: true,
                nome_completo: true,
                cpf: true,
                administrador: true,
            }

        })
        return response.json(result)
    }
    return response.status(401)
})

app.post('/updatedadosusers', async (request, response) => {
    const body = request.body
    if (body.id) {
        console.log(body)
        const updateUser = await prisma.user.update({
            where: {
                id: Number(body.id)
            },
            data: {
                email: body.email,
                nome_completo: body.nome_completo,
                cpf: body.cpf,
                administrador: body.administrador,
                cargo: body.cargo,
                setor: body.setor
            }

        })
        return response.json(updateUser)
    }
    return response.status(401)
})

app.post('/getdadosusers', async (request, response) => {
    const body = request.body
    console.log(body)
    if (body.id) {
        const result = await prisma.user.findFirst({
            where: {
                id: Number(body.id)
            },
            select: {
                id: true,
                email: true,
                nome_completo: true,
                cpf: true,
                administrador: true,
                cargo: true,
                setor: true
            }

        })
        return response.json(result)
    }
    return response.status(401)
})


app.listen(3334)