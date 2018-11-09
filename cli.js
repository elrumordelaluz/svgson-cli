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

const checkDirectory = async input => {
  const _ = await stat(input)
  return _.isDirectory()
}

const init = async () => {
  const {
    input: [cliInput],
    flags: { output, pretty, separated, camelcase },
  } = cli

  let inputStr = ''

  const stdin = await getStdin()
  const parseWithSvgson = input => svgson(input, { camelcase })

  const checkAndParse = async input => {
    if (isSvg(input)) {
      return await parseWithSvgson(input)
    }
    throw 'Invalid SVG'
  }

  const outputData = async (data, name = null) => {
    const str = JSON.stringify(data, null, pretty ? 4 : null)
    return output
      ? await writeFile(
          `${output.replace('.json', '')}${name ? `_${name}` : ''}.json`,
          str,
          'utf8'
        )
      : console.log(str)
  }

  try {
    if (stdin !== '') {
      const parsed = await checkAndParse(stdin)
      return await outputData(parsed)
    }

    const isDirectory = await checkDirectory(cliInput)
    if (isDirectory) {
      const files = await readdir(cliInput)
      if (files.length) {
        for (const file of files) {
          const _file = await readFile(resolve(cliInput, file))
          const parsed = await checkAndParse(_file.toString())
          if (separated) {
            outputData(parsed, file.replace('.svg', ''))
          }
          inputStr = `${inputStr}${_file.toString()}`
        }
        if (!separated) {
          const parsed = await parseWithSvgson(inputStr)
          outputData(parsed)
        }
      }
    } else {
      const file = await readFile(cliInput)
      const parsed = await checkAndParse(file.toString())
      return outputData(parsed)
    }
  } catch (err) {
    throw err
  }
}

init()
