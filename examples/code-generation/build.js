#!/usr/bin/env node
const { build, scandir, watchdir, cliopts, glob } = require("estrella")
const fs = require("fs")
const { join:P, dirname } = require("path")
const CoffeeScript = require("coffeescript")

// directory where we will write js files generated by CoffeeScript
const jsdir = "tmp"

// 1. Compile all .coffee files to .js files.
// 2. Using esbuild, compile .js files into a bundle.
// 3. In watch mode, recompile as coffee and js files change.
compileCoffeScriptAll(glob("*.coffee")).then(() => {
  build({
    entry:   P(jsdir, "main.coffee.js"),
    outfile: P("out", "main.js"),
    bundle: true,
  })

  // When running ./build.js -watch, recompile .coffee files as they change
  cliopts.watch && watchdir(".", /\.coffee$/i, compileCoffeScriptAll)
})

// compiles one .coffee file to a .js file: foo/bar.coffee -> {jsdir}/foo/bar.coffee.js
// Returns true on success. On error, message is logged and false is returned.
async function compileCoffeeScript(filename) {
  const code = await fs.promises.readFile(filename, "utf8")
  try {
    const { js } = CoffeeScript.compile(code, {
      sourceMap: true,
      inlineMap: true,
      bare: true,
      filename,
    })
    const jsfile = P(jsdir, filename + ".js")
    await fs.promises.mkdir(dirname(jsfile), {recursive:true}) // requires node 10.12
    await fs.promises.writeFile(jsfile, js, "utf8")
  } catch (err) {
    if (!err.location) { throw err }
    // CoffeeScript error objects contain a nicely formatted message
    console.error(err.toString())
    return false
  }
  return true
}

// compiles all provided .coffee files. Returns true if all succeeded.
function compileCoffeScriptAll(files) {
  return Promise.all(files.map(compileCoffeeScript)).then(v => v.every(ok => ok))
}
