import { PrismaClient } from '@prisma/client'
import express from 'express'
import { createHash } from 'node:crypto'
import cors from 'cors';
import jwt from 'jsonwebtoken'

const app = express()
/*
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
*/

function md5(content) {
    return createHash('md5').update(content).digest('hex')
}

function verifyJWT(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json("No token provided.")
    }

    jwt.verify(token, process.env.SECRET, function (err, decoded) {
        if (err) {
            return res.status(500).json("Failed to authenticate token")
        }
        req.userId = decoded.id,
        req.administrador = decoded.administrador
        next()
    })
}


function verifyJWTAdmin(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json("No token provided.")
    }

    jwt.verify(token, process.env.SECRET, function (err, decoded) {
        if (err || decoded.administrador != true) {
            return res.status(500).json("Failed to authenticate token")
        }
        req.userId = decoded.id,
            req.administrador = decoded.administrador;
        next()
    })
}


const prisma = new PrismaClient({
    log: ['query']
})


//app.use(cors(corsOptions));
app.use(cors());
app.use(express.json())

app.post('/refreshtoken', async (req, res) => {
    const refresh_token = req.headers['refreshtoken'];
    if (!refresh_token) {
        return res.status(401).json("No token provided.")
    }

    jwt.verify(refresh_token, process.env.REFRESH_SECRET, async function (err, decoded) {
        if (err) {
            return res.status(500).json("Failed to authenticate token")
        }
        else if (decoded.expiresIn < Date.now()) {
            return res.status(500).json("Expired")
        }
        else {
            const result = await prisma.user.findFirst({
                where: {
                    id: decoded.id,

                },
                select: {
                    email: true,
                    nome_completo: true,
                    administrador: true,
                    empresa: true,
                    id: true,
                }
            })
            if (result != null) {
                const token = jwt.sign({ id: result.id, administrador: result.administrador }, process.env.SECRET, { expiresIn: 900 })
                const refresh_token = jwt.sign({ id: result.id }, process.env.REFRESH_SECRET, { expiresIn: 1800 })
                return res.json({ ...result, token, refresh_token })
            }
        }

    })
})

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
                id: true,
            }
        })
        if (result != null) {
            const token = jwt.sign({ id: result.id, administrador: result.administrador }, process.env.SECRET, { expiresIn: 900 })
            const refresh_token = jwt.sign({ id: result.id }, process.env.REFRESH_SECRET, { expiresIn: 1800 })
            return response.json({ ...result, token, refresh_token })
        }

    }
    else {
        return response.status(401)
    }

})

app.post('/getusers', verifyJWTAdmin, async (request, response) => {
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

app.post('/getveiculos', verifyJWTAdmin, async (request, response) => {
    const body = request.body
    if (body.empresaid) {
        const result = await prisma.carro.findMany({
            where: {
                empresaId: body.empresaid
            },
            select: {
                id: true,
                marca: true,
                modelo: true,
                placa: true,
                identificacao: true,
            }

        })
        return response.json(result)
    }
    return response.status(401)
})

app.post('/getreservas', verifyJWT, async (request, response) => {
    const body = request.body
    if (body.email) {
        const result = await prisma.marcacao.findMany({
            where: {
                usuario: {
                    email: body.email
                }
            },
            select: {
                destino: true,
                data_inicio: true,
                data_fim: true,
                observacao: true,
                carro: {
                    select: {
                        marca: true,
                        modelo: true,
                        placa: true,
                        identificacao: true,
                    }
                }
            }

        })
        return response.json(result)
    }
    return response.status(401)
})


app.post('/updatedadosusers', verifyJWTAdmin, async (request, response) => {
    const body = request.body
    if (body.id) {
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
        return response.json("sucesso")
    }
    return response.status(401)
})

app.post('/updatedados', verifyJWT, async (request, response) => {
    const body = request.body
    if (body.id && body.email) {
        const get_email = await prisma.user.findFirst({
            where: {
                email: body.email,
                id: {
                    not: body.id
                }
            },
            select: {
                email: true,
            }
        })

        if (get_email === null) {

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
            return response.json("sucesso")
        }
        else {
            return response.json("Já existe um outro usuário com esse e mail.")
        }

    }
    return response.json("Houve um erro.")

})

app.post('/updatesenha', verifyJWT, async (request, response) => {
    const body = request.body
    if (body.senhaantiga && body.senhanova && body.id) {
        const get_user = await prisma.user.findFirst({
            where: {
                id: Number(body.id),
                senha: md5(body.senhaantiga)
            },
            select: {
                id: true,
            }
        })

        if (get_user != null) {
            const update_senha = await prisma.user.update({
                where: {
                    id: Number(body.id),
                    senha: md5(body.senhaantiga)
                },
                data: {
                    senha: md5(body.senhanova)
                }
            })
            return response.json("sucesso")
        }
        else {
            return response.json("Senha inválida.")
        }

    }
    else {
        return response.json("Erro.")
    }

})


app.post('/updatedadosveiculo', verifyJWTAdmin, async (request, response) => {
    const body = request.body
    if (body.id) {
        const updateUser = await prisma.carro.update({
            where: {
                id: Number(body.id)
            },
            data: {
                marca: body.marca,
                modelo: body.modelo,
                placa: body.placa,
                identificacao: body.identificacao,
            }

        })
        return response.json("sucesso")
    }
    return response.status(401)
})

app.post('/getdadosusers', verifyJWTAdmin, async (request, response) => {
    const body = request.body
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

app.post('/getdados', verifyJWT, async (request, response) => {
    const body = request.body
    if (body.email) {
        const result = await prisma.user.findFirst({
            where: {
                email: body.email
            },
            select: {
                email: true,
                nome_completo: true,
                cpf: true,
                cargo: true,
                setor: true,
                id: true,
            }

        })
        return response.json(result)
    }
    return response.status(401)
})

app.post('/getmarcacoesdia', verifyJWT, async (request, response) => {
    const body = request.body
    let inicio = body.data + "T00:00:00.000Z"
    let fim = body.data + "T23:59:59.000Z"
    if (body.empresa) {
        const result = await prisma.marcacao.findMany({
            where: {
                AND: [
                    {
                        data_inicio: {
                            lte: new Date(fim)
                        }
                    },
                    {
                        data_fim: {
                            gte: new Date(inicio)
                        }
                    }
                ],

                empresaId: Number(body.empresa),

            },
            select: {
                destino: true,
                data_inicio: true,
                data_fim: true,
                observacao: true,
                carro: {
                    select: {
                        marca: true,
                        modelo: true,
                        placa: true,
                        identificacao: true
                    }
                },
                usuario: {
                    select: {
                        nome_completo: true,
                    }
                }

            }

        })
        return response.json(result)
    }
    return response.status(401)
})

app.post('/getdadosveiculo', verifyJWTAdmin, async (request, response) => {
    const body = request.body
    if (body.id) {
        const result = await prisma.carro.findFirst({
            where: {
                id: Number(body.id)
            },
            select: {
                id: true,
                marca: true,
                modelo: true,
                placa: true,
                identificacao: true,
            }

        })
        return response.json(result)
    }
    return response.status(401)
})

app.post('/adduser', verifyJWTAdmin, async (request, response) => {
    const body = request.body
    const consultacpfemail = await prisma.user.findFirst({
        select: {
            email: true,
            cpf: true,
        },
        where: {
            OR: [{
                email: {
                    equals: body.email
                }
            },
            {
                cpf: {
                    equals: body.cpf
                }
            }

            ],

        }
    })
    if (consultacpfemail === null) {
        const result = await prisma.user.create({
            data: {
                email: body.email,
                nome_completo: body.nome_completo,
                cpf: body.cpf,
                cargo: body.cargo,
                setor: body.setor,
                senha: md5(body.senha),
                administrador: body.administrador,
                empresa: {
                    connect: {
                        id: body.empresaid
                    }
                }
            }

        })
        return response.json("sucesso")
    }
    return response.json("CPF ou e mail já cadastrado na base.")
})

app.post('/addveiculo', verifyJWTAdmin, async (request, response) => {
    const body = request.body

    if (body) {
        const result = await prisma.carro.create({
            data: {
                marca: body.marca,
                modelo: body.modelo,
                placa: body.placa,
                identificacao: body.identificacao,
                empresaId: body.empresaid,

            }

        })
        return response.json("sucesso")
    }
    return response.json("Houve um erro no cadastramento.")
})

app.post('/addmarcacao', verifyJWT, async (request, response) => {
    const body = request.body
    if (body) {
        const result = await prisma.marcacao.create({
            data: {
                destino: body.destino,
                data_inicio: body.data_partida,
                data_fim: body.data_retorno,
                observacao: body.observacao,
                carroId: Number(body.veiculo),
                userEmail: body.email,
                empresaId: body.empresa,

            }

        })
        return response.json("sucesso")
    }
    return response.json("Houve um erro no cadastramento.")
})

app.post('/deleteveiculo', verifyJWTAdmin, async (request, response) => {
    const body = request.body
    if (body.id) {
        const result = await prisma.carro.delete({
            where: {
                id: Number(body.id)
            }
        })
        return response.json("sucesso")
    }
    return response.json("Houve algum erro.")
})

app.post('/deleteuser', verifyJWTAdmin, async (request, response) => {
    const body = request.body
    if (body.id) {
        const result = await prisma.user.delete({
            where: {
                id: Number(body.id)
            }
        })
        return response.json("sucesso")
    }
    return response.json("Houve algum erro.")
})

/*app.post('/getmarcacoes', async (request, response) => {
    const body = request.body
    if (body) {
        const result = await prisma.marcacao.findMany({
            where: {
                AND: [
                    {
                        data_inicio: {
                            gte: new Date(body.data_inicio)
                        }

                    },
                    {
                        data_inicio: {
                            lte: new Date(body.data_fim)
                        }

                    }
                ]
            }
        })
        return response.json(result)
    }
    return response.json("Houve algum erro.")
}) */

app.post('/getcarrosindisponiveis', verifyJWT, async (request, response) => {
    const body = request.body;
    if (body) {
        const marcacoes = await prisma.marcacao.findMany({
            where: {
                carro: {
                    empresaId: Number(body.empresa)
                },
                AND: [
                    {
                        data_inicio: {
                            lte: new Date(body.ultimodia)
                        }
                    },
                    {
                        data_fim: {
                            gte: new Date(body.primeirodia)
                        }
                    }
                ]
            },
            orderBy: {
                data_inicio: 'asc',
            },
            select: {
                id: true,
                destino: true,
                data_inicio: true,
                data_fim: true,
                observacao: true,
                usuario: {
                    select: {
                        email: true,
                        nome_completo: true,
                    },
                },
                carro: true,
            }
        });
        return response.json(marcacoes);
    }

    return response.json("Houve algum erro.");
})

app.post('/getmarcacoesmes', verifyJWT, async (request, response) => {
    const body = request.body;
    if (body) {
        const marcacoes = await prisma.marcacao.findMany({
            where: {

                empresaId: Number(body.empresa),

                OR: [
                    {
                        AND: [
                            {
                                data_inicio: {
                                    gte: body.data_partida,
                                },
                            },
                            {
                                data_inicio: {
                                    lte: body.data_retorno,
                                },
                            }

                        ],
                    },
                    {
                        AND: [
                            {
                                data_fim: {
                                    gte: body.data_partida,
                                },
                            },
                            {
                                data_fim: {
                                    lte: body.data_retorno,
                                },
                            }

                        ],
                    }
                ]
            },
            orderBy: {
                data_inicio: 'asc',
            },
            select: {
                id: true,
                destino: true,
                data_inicio: true,
                data_fim: true,
                observacao: true,
                usuario: {
                    select: {
                        email: true,
                        nome_completo: true,
                    },
                },
                carro: true,
            }
        });
        return response.json(marcacoes);
    }

    return response.json("Houve algum erro.");
})


app.listen({
    host: '0.0.0.0',
    port: process.env.PORT ? Number(process.env.PORT) : 3333,
})