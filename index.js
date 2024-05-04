import express from 'express'
import {writeFile,readFile, readdir, rename, unlink} from 'fs/promises'
import { marked } from 'marked';


const app = express()
const PORT = process.env.PORT || 3000
const __dirname = import.meta.dirname
const dataPath = __dirname+'/data/'

// middleware
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))

// handler
const stringFechaActual = () =>{
    const fecha = new Date()
    return `${fecha.toISOString().slice(0,10)} `
}


const createDocument = async(archivo, contenido,extension) => {

    if(extension === 'json'){
        const newDoc = {
            archivo,
            contenido: stringFechaActual()+contenido 
        }
        await writeFile(__dirname+`/data/${archivo}.${extension}`,JSON.stringify(newDoc))
        return newDoc
    } else {
        await writeFile(__dirname+`/data/${archivo}.${extension}`,stringFechaActual()+contenido)
        return
    }   
}


const getDir = async() =>{
    try{
        const dir = await readdir(__dirname+'/data',"utf-8")
        return dir
    } catch(err){
        console.error(err)
    }
}

const documentAlreadyExist = async ( name , ext) => {
    const fileName = `${name}.${ext}`
    const dir = await getDir()
    return dir.includes(fileName)
}

const getDocumentByName = async(name,ext) => {
    try{
        const fileName = `${name}.${ext}`
        const file = await readFile(dataPath+fileName,'utf-8')
        return file
    } catch(err) {
        console.log(err)
    }
}

// routes
app.get("/", (req,res)=>{
    res.sendFile(__dirname+'public')
})

  // READ
app.get("/lista-archivos", async (req,res)=>{
    const dir = await getDir()
    console.log(dir)
    res.send(dir)
})


app.get("/leer", async (req,res)=>{
    console.log(req.query)
    const {archivo, extension} = req.query
    if(!archivo || !extension) return res.status(400).send('todos los datos son obligatorios')
    const file = await getDocumentByName(archivo,extension) || null
    if(!file) return res.status(400).send('no existe el archivo')
    if(extension === 'json') return res.json(JSON.parse(file)) 
    if(extension === 'md') {
        const html = marked.parse(file);
        console.log(html)
        return res.send(html)
    }
    return res.send(file)
})

  //POST 
app.post("/crear", async(req, res) =>{     
    const {archivo,contenido,extension} = req.body
    const documentNameRepeated = await  documentAlreadyExist(archivo,extension) 
    
    if(!archivo || !contenido || ! extension) return res.status(400).send("todos los campos son obligatorios");
    if( documentNameRepeated ) return res.status(400).send("archivo ya existe")
    
    createDocument(archivo, contenido,extension)
    res.status(200).send("archivo creado")
})

// PUT
app.post("/renombrar", async(req, res) =>{     
    console.log( req.body)
    const {nombre, nuevoNombre, extension} = req.body
    if(!nombre || !nuevoNombre || !extension) return res.status(400).send("todos los campos son obligatorios");
    
    const file = await getDocumentByName(nombre,extension) || null
    if(!file) return res.status(400).send('no existe el archivo')
    
    await rename(dataPath+nombre+'.'+extension,dataPath+nuevoNombre+'.'+extension)

    res.status(200).send(`archivo renombrado de ${nombre}.${extension} a ${nuevoNombre}.${extension}`)
})


// DELETE
app.get("/eliminar", async(req,res)=> {
    const {archivo,extension} = req.query
    if(!archivo || !extension) return res.status(400).send('todos los datos son obligatorios')
    const file = await getDocumentByName(archivo,extension) || null
    if(!file) return res.status(400).send('no existe el archivo')
    await unlink(dataPath+archivo+'.'+extension)
    res.status(200).send("archivo eliminado")
})



//404
app.get("/*", (req,res)=>{
    res.status(404).json({ok:false,msg:"esta página no existe"})
})

app.listen(PORT, () => {
    console.log(`listen on port ${PORT}`)
})