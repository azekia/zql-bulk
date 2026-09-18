import { TWconnect, TWrequest, addItem2ListComma, value2sqlexpresion, dialectObjectName } from "./zedious.mjs";

async function doInsertsFromSelect(argumentos) {
  const conOptions = {
    server: argumentos.server,
    database: argumentos.database,
    user: argumentos.user,
    password: argumentos.password,
  };
  
  const sqlConnection = await TWconnect(conOptions);
  let queryText = `SELECT ${argumentos.columns} from ${dialectObjectName(argumentos.table,argumentos.todialect)}`;
  if (argumentos.where) queryText += ` WHERE ${argumentos.where}`;
  const result = await TWrequest(sqlConnection, queryText);
  let listaCampos = "";
  for (let c in result.columns) {
    if (result.columns[c].colName == "timestamp") continue;
    listaCampos = addItem2ListComma(listaCampos, `${dialectObjectName(result.columns[c].colName, argumentos.todialect)}`);
  }
  let cabeceraInsert = `INSERT INTO ${dialectObjectName(argumentos.totable || argumentos.table, argumentos.todialect)} (${listaCampos})\nVALUES\n`;
  let valueLines = [];
  for (let r in result.rows) {
    let row = result.rows[r];
    let listaValores = "";
    for (let c in result.columns) {
      if (result.columns[c].colName == "timestamp") continue;
      listaValores = addItem2ListComma(listaValores, value2sqlexpresion(row[c], result.columns[c], argumentos.todialect));
    }
    valueLines.push(`(${listaValores})`);
  }
  let ifs = cabeceraInsert + valueLines.join(",\n") + ';\n';
  sqlConnection.close();
  return ifs;
}

export { doInsertsFromSelect };
