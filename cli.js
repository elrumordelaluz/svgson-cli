#!/usr/bin/env node
'use strict'
const fs = require('fs')
const svgson = require('svgson').default
const meow = require('meow')
const isSvg = require('is-svg')
const getStdin = require('get-stdin')
const { resolve } = require('path')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

const cli = meow(
  `
	Usage
    $ svgson [input] <options>
    
  Options
	  --output, -o  Output file
	  --pretty, -p  Pretty Output 
	  --separated, -s  Output separated files 
	  --camelcase, -c  Camelcase attributes names 

	Examples
	  $ svgson icon.svg
	  
`,
  {
    booleanDefault: undefined,
    flags: {
      output: {
        type: 'string',
        alias: 'o',
      },
      pretty: {
        type: 'boolean',
        alias: 'p',
      },
      separated: {
        type: 'boolean',
        alias: 's',
      },
      camelcase: {
        type: 'boolean',
        alias: 'c',
      },
    },
  }
)

async function checkDirectory(input) {
  const _ = await stat(input)
  return _.isDirectory()
}

async function parseWithSvgson(input, options) {
  return await svgson(input, options)
}

async function checkAndParse(input, options) {
  if (isSvg(input)) {
    return await parseWithSvgson(input, options)
  }
  throw 'Invalid SVG'
}

async function outputData(data, { name = null, output, pretty }) {
  const str = JSON.stringify(data, null, pretty ? 4 : null)
  return output
    ? await writeFile(
        `${output.replace('.json', '')}${name ? `_${name}` : ''}.json`,
        str,
        'utf8'
      )
    : console.log(str)
}

async function init() {
  const {
    input: [cliInput],
    flags: { output, pretty, separated, camelcase },
  } = cli

  if (cli.flags.h) cli.showHelp()

  let inputStr = ''
  const stdin = await getStdin()

  try {
    if (stdin !== '') {
      const parsed = await checkAndParse(stdin, { camelcase })
      return await outputData(parsed, { output, pretty })
    }

    if (isSvg(cliInput)) {
      const parsed = await parseWithSvgson(cliInput, { camelcase })
      return outputData(parsed, { output, pretty })
    }

    const isDirectory = await checkDirectory(cliInput)
    if (isDirectory) {
      const files = await readdir(cliInput)
      if (files.length) {
        for (const file of files) {
          const _file = await readFile(resolve(cliInput, file))
          const parsed = await checkAndParse(_file.toString(), { camelcase })
          if (separated) {
            outputData(parsed, {
              name: file.replace('.svg', ''),
              output,
              pretty,
            })
          }
          inputStr = `${inputStr}${_file.toString()}`
        }
        if (!separated) {
          const parsed = await parseWithSvgson(inputStr, { camelcase })
          outputData(parsed, { output, pretty })
        }
      }
    } else {
      const file = await readFile(cliInput)
      const parsed = await checkAndParse(file.toString(), { camelcase })
      return outputData(parsed, { output, pretty })
    }
  } catch (err) {
    throw err
  }
}

init()
