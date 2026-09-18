# zql-bulk
Una herramienta básica creada para Node.js que permite realizar importaciones de datos desde SQL Server

Copyright 2022-2025 by AZEKIA Soluciones IT, SL
https://azekia.com

*Enjoy it under the MIT License (see LICENSE.md)*

Con esta herramienta podrás crear desde línea de comandos:
 
 - Scripts SQL para crear tablas
 - Scripts SQL para insertar datos con el contenido de las tablas
 - Archivo JSON con el contenido de las tablas

# Installation
En un entorno con Node.js instalado, puedes instalar zql-bulk de forma global utilizando npm:

```
git clone https://github.com/azekia/zql-bulk
cd zql-bulk
nmp i
npm i -g .
```


Para obtener actualizaciones, simplmente haz un `git pull` en el directorio del proyecto y vuelve a ejecutar `npm i -g .`

```
git pull
npm i -g .
```

Podrás usar la utilidad directamente desde el terminal con el comando `zql-bulk`

```
C:\Users\antonio\Downloads>zql-bulk

Usage: zql-bulk [options] (or use ZQLBULK_ env vars)



Options:
  --help      Show help                                                [boolean]
  --version   Show version number                                      [boolean]
 ...

Missing required arguments: action, server, user, database, table
```



### Scripts para CREATE de tablas
Usando la acción `create`, puedes generar scripts SQL para crear tablas basadas en el esquema de una tabla existente.

```
$ zql-bulk --action create --server 192.168.1.5 --user administrador --password jfjfj
--database MIBD --table Familias --columns *
```
generará una salida similar a...

```sql
-- CREATE TABLE Familias =================================================
CREATE TABLE [Familias] (
    [tos] INT NULL,
    [familiaCod] NVARCHAR(50) NOT NULL,
    [nombre] NVARCHAR(50) NOT NULL,
    [familiaMadreCod] NVARCHAR(20) NOT NULL,
    [orden] INT NOT NULL
)
```

Por el momento no se generan los índices ni las claves foráneas, pero puedes añadirlos manualmente al script generado.


### Scripts para INSERTS de datos

Usando la acción `insert`, puedes generar scripts SQL para insertar datos en una tabla específica.

```
$ zql-bulk --action insert --server 192.168.1.5 --user administrador --password 123456 
--database MIBD --table Familias --columns 'familiaCod,nombre'
```
generará una salida similar a...

```sql

INSERT INTO [Familias] ([familiaCod],[nombre]) VALUES ('GS23','JUDIAS VERDES')
go
INSERT INTO [Familias] ([familiaCod],[nombre]) VALUES ('GS24','BERENJENAS')
go

```

Puedes redirigir la salida a un archivo usando el operador `>` en la terminal:

```
$ zql-bulk --action insert --server 192.168.1.5 --user administrador --password 123456 
--database MIBD --table Familias --columns 'familiaCod,nombre' > Familias.sql
```

### Scripts para MIGRACIÓN de datos

La acción `migrate` combina la creación de la tabla de destino y la inserción de datos desde la tabla de origen. 
Es útil para migrar datos de una tabla a otra en un solo paso.

```
$ zql-bulk --action migrate --server 192.168.1.5 --user administrador --password 123456 
--database MIBD --table Familias --columns '*' --totable FamiliasBackup > MigrateFamilias.sql
```

### Archivo JSON con el contenido de las tablas

Usando la acción `exportjson`, puedes generar un archivo JSON con el contenido de la tabla.

```
 zql-bulk --action exportjson --server 192.168.1.5 --user administrador --password 123456 
 --database MIBD --table Familias --columns 'familiaCod,nombre' 
 --where "familiaMadreCod='' and familiaCod LIKE '0%'" 
 --prettyJson
```
generará una salida similar a...
```json
[
  {
    "familiaCod": "01",
    "nombre": "ABONOS"
  },
  {
    "familiaCod": "02",
    "nombre": "PESTICIDAS"
  }
]
```

### Otras opciones

Puedes usar las opciones `--prettyJson` para obtener un JSON más legible.

Puedes usar las opciones `--blobAsBase64`, `--blobAsSqlHex` o `--blobAsArray` para formatear las columnas de tipo BLOB en diferentes formatos según te convenga.

Puedes usar la opcion `--where` para filtrar los datos que se consideran para exportan a JSON o INSERTs.

Puedes usar la opción `--totable` para especificar una tabla de destino para las inserciones.

Puedes usar la opción `--todialect` para especificar un dialecto SQL alternativo en la salida (por ejemplo, 'mssql', 'pg'...).

### Variables de entorno

Puedes usar variables de entorno en lugar de algunos parámetros.
La asignar de valores a variables de entorno dependerá de tu sistema operativo y entorno de comandos: `SET` o `export`

```
  ZQLBULK_SERVER
  ZQLBULK_PORT
  ZQLBULK_USER
  ZQLBULK_PASSWORD
  ZQLBULK_DATABASE
  ZQLBULK_TABLE
  ZQLBULK_COLUMNS
``` 

Si no se especifica password, la utilidad la solicitará en el momento de ejecución.
