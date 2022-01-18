const mysql = require("mysql2/promise");

async function query(db, sql, settings) {
    return await db.query(sql, {nestTables: settings?.nestTables});
}

async function end(db, sql, settings) {
    return await db.end();
}

async function dump(...tables) {
    let exec = async (sql) => await db.query(sql);
    tables = tables.length > 0 ? Array.from(tables) : (await exec("show tables"))[0].map(e => Object.values(e)[0]);

    let dump = [];
    let miniDump = [];
    let ret = {};

    for(let t of tables) {
        ret = (await exec("show create table " + t))[0][0];
        dump.push("-- " + ret["Table"] + " --"); // jshint ignore:line
        dump.push(ret["Create Table"]);
        dump.push("");

        ret = (await exec("select * from " + t));
        if(ret[0][0] !== undefined) {
            let qmark = Object.keys(ret[0][0]).map(() => "?").join(", ");
            dump.push(mysql.format(`INSERT INTO ${t} (${qmark}) VALUES`, Object.keys(ret[0][0])));
            miniDump = [];
            for(let r of ret[0]) {
                miniDump.push("    " + mysql.format(`(${qmark})`, Object.values(r)));
            }
            dump.push(miniDump.join(",\n"));
            dump[dump.length - 1] += ";";
            dump.push("");
        }
    }

    return dump;
}

/**
 * 
 * @param opts - An object containing {host, port, user, password, database, driver} 
 * @returns A database object that maps sqlcli functions to mysql functions
 */
async function createConnection(opts) {
    // Clean opts and connect to the DB
    const validOpts = [
        "host",
        "port",
        "localAddress",
        "socketPath",
        "user",
        "password",
        "database",
        "charset",
        "timezone",
        "connectTimeout",
        "stringifyObjects",
        "insecureAuth",
        "typeCast",
        "queryFormat",
        "supportBigNumbers",
        "bigNumberStrings",
        "dateStrings",
        "debug",
        "trace",
        "localInfile",
        "multipleStatements",
        "flags",
        "ssl"
    ];
    let params = {};
    for(let k of validOpts) {
        if(opts[k]) params[k] = opts[k];
    }
    console.log(opts);
    console.log(params);
    let db = await mysql.createConnection(params);

    // Return bindings
    return {
        db,
        query: query.bind(null, db),
        end: end.bind(null, db),
        dump: dump.bind(null, db),
    };
}

module.exports = {
    createConnection,
    COMMENT_MARKER: "--",
};