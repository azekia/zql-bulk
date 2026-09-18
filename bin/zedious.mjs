import { Connection, Request } from "tedious";
function dialectObjectName(name, dialect) {
  switch (dialect) {
    case "mssql":
      return `[${name}]`;
    case "pg":
      return `"${name}"`;
    case "mysql":
      return `\`${name}\``;
    default:
      return `"${name}"`;
  }
}
function value2sqlexpresion(valor, coldef, dialecto) {
  let tipo = typeof valor;
  let retorno;
  switch (tipo) {
    case "string":
      retorno = "'" + valor.replace(/'/g, "''") + "'";
      break;
    case "boolean": // para que entre por aquí un campo tinyint, hay que hacer convert(bit, campo)
      if (dialecto === "pg") retorno = (valor ? 'true' : 'false');
      else retorno = valor + "";
      break;
    case "number":
      retorno = valor + "";
      break;
    case "object":
      if (valor === null) {
        retorno = "NULL";
      } else if (valor instanceof Date) {
        //AAAAMMDD hh:mm:ss.nnnnnn
        retorno = "'";
        retorno +=
          ("0000" + valor.getUTCFullYear()).slice(-4) +
          ("00" + (valor.getUTCMonth() + 1)).slice(-2) +
          ("00" + valor.getUTCDate()).slice(-2);

        if (
          valor.getUTCHours() ||
          valor.getUTCMinutes() ||
          valor.getUTCSeconds() ||
          valor.getUTCMilliseconds()
        ) {
          retorno +=
            " " +
            ("00" + valor.getUTCHours()).slice(-2) +
            ":" +
            ("00" + valor.getUTCMinutes()).slice(-2) +
            ":" +
            ("00" + valor.getUTCSeconds()).slice(-2) +
            "." +
            ("000" + valor.getUTCMilliseconds()).slice(-3);
        }
        retorno += "'";
      } else if (Buffer.isBuffer(valor)) {
        retorno = `0x${(valor)?.toString('hex')?.toUpperCase()}`
      } else if (valor.expresion != undefined) {
        retorno = valor.expresion;
      } else {
        throw new Error("valor no expresable en sql: ") //+ valor)
      }
      break;
    default:
      throw new Error("value2sqlexpresion: tipo de datos no reconocido: "+ tipo)
      break;
  }
  return retorno;
}

function addItem2ListComma(lista, elemento, indent) {
  if (lista == "") return (indent ? indent : "") + elemento;
  else return lista + "," + (indent ? "\n" + indent : "") + elemento;
}

function addItem2ListAnd(lista, elemento) {
  if (lista == "") return "(" + elemento + ")";
  else return lista + " AND (" + elemento + ")";
}

function bufToBigint(buf) {
  let ret = BigInt(0);
  for (const i of buf.values()) {
    const bi = BigInt(i);
    ret = (ret << 8n) + bi;
  }
  return ret;
}

function sqlClauseForCreateTable(tablename, columnclauses) {
  return `CREATE TABLE [${tablename}] (\n${columnclauses}\n);\n `;
}

function sqlClauseForCreateColumn(col) {
  // parece que NULLABLE depende de un bit en col.flags (el bit menos significativo?)
  let nullable = (col.flags & 1) ? "NULL" : "NOT NULL"; 
  switch (col.type.id) {
    case 173: // binary ¿timestamp?
      if (col.colName == "timestamp") {
        return `[timestamp] TIMESTAMP`;
      } else {
        return `[${col.colName}] BINARY NULL`;
      }
    case 106:
      return `[${col.colName}] DECIMAL(${col.precision},${col.scale}) ${nullable}`;
    case 48:
      return `[${col.colName}] TINYINT ${nullable}`;
    case 104:
      return `[${col.colName}] BITN ${nullable}`;
    case 52:
      return `[${col.colName}] SMALLINT ${nullable}`;
    case 56:
    case 38:
      return `[${col.colName}] INT ${nullable}`;
    case 127:
      return `[${col.colName}] BIGINT ${nullable}`;
    case 167:
    case 231:
      return `[${col.colName}] NVARCHAR(${col.dataLength/2}) ${nullable}`;
    case 61:
      return `[${col.colName}] DATETIME ${nullable}`;
    case 36:
      return `[${col.colName}] UNIQUEIDENTIFIER ${nullable}`;
    case 34:
      return `[${col.colName}] IMAGE NULL`;
    default:
      console.error(col);
      throw new Error(`TIPO [${col.colName}] ${col.type.id} ${col.type.type} ${col.type.name} !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
  }
}

const TWconnect = (argumentos) =>
  new Promise((resolve, reject) => {
    const config = {
      server: argumentos.server,
      options: {
        database: argumentos.database,
        rowCollectionOnDone: true,
        useColumnNames: false,
        encrypt: false,
        trustServerCertificate: true,
        cryptoCredentialsDetails: {
          minVersion: "TLSv1",
          ciphers: "DEFAULT@SECLEVEL=0",
        },
      },
      authentication: {
        type: "default",
        options: {
          userName: argumentos.userName || argumentos.user,
          password: argumentos.password,
        },
      },
    };

    const connection = new Connection(config);
    connection.on("connect", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
    connection.connect();
  });

const TWrequest = (sqlConnection, queryText) =>
  new Promise((resolve, reject) => {
    let cuentaRows = 0;
    let result = { err: false, columns: [], rows: [] };
    const request = new Request(queryText, (err) => {
      if (err) {
        reject(err);
      } else {
        result.rows = result.rows.map((row) => {
          let rowsimplificada = {};
          for (let c in row) {
            if (c == "timestamp")
              rowsimplificada[c] = bufToBigint(row[c].value).toString();
            else rowsimplificada[c] = row[c].value;
          }
          return rowsimplificada;
        });
        result.checkCount = cuentaRows;
        resolve(result);
      }
    });
    request.on("done", function (rowCount, more, rows) {
      if (rows && rows.length) result.rows = rows;
    });
    request.on("doneProc", function (rowCount, more, returnStatus, rows) {
      if (rows && rows.length) result.rows = rows;
    });
    request.on("doneInProc", function (rowCount, more, rows) {
      if (rows && rows.length) result.rows = rows;
    });
    request.on("columnMetadata", function (columns) {
      if (columns) result.columns = columns;
    });
    request.on("row", function (columns) {
      cuentaRows++;
    });
    request.on("error", function (err) {
      console.log("ERROR executeSQL:", err);
      result.err = true;
    });
    sqlConnection.execSql(request);
  });

export {
  TWconnect,
  TWrequest,
  sqlClauseForCreateTable,
  sqlClauseForCreateColumn,
  value2sqlexpresion,
  addItem2ListComma,
  addItem2ListAnd,
  bufToBigint,
  dialectObjectName,
};
