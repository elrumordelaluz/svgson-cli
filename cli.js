#!/usr/bin/env node
'use strict'
const meow = require('meow')
const { default: svgson } = require('svgson-next')
const isSvg = require('is-svg')
const fs = require('fs')
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
  const isDirectory = await checkDirectory(cliInput)
  const parseWithSvgson = input => svgson(input, { camelcase })

  if (isDirectory) {
    const files = await readdir(cliInput)
    if (files.length) {
      for (const file of files) {
        const _file = await readFile(resolve(cliInput, file))
        if (isSvg(_file)) {
          const parsed = await parseWithSvgson(_file.toString())
          if (separated) {
            await writeFile(
              `${output ? output.replace('.json', '') : 'out'}_${file.replace(
                '.svg',
                ''
              )}.json`,
              JSON.stringify(parsed, null, pretty ? 4 : null),
              'utf8'
            )
          }
          inputStr = `${inputStr}${_file.toString()}`
        }
      }

      if (!separated) {
        const parsed = await parseWithSvgson(inputStr)
        await writeFile(
          cli.flags.output || 'out.json',
          JSON.stringify(parsed, null, pretty ? 4 : null),
          'utf8'
        )
      }
    }
  } else {
    const file = await readFile(cliInput)
    if (isSvg(file)) {
      const parsed = await parseWithSvgson(file.toString())
      await writeFile(
        output || 'out.json',
        JSON.stringify(parsed, null, pretty ? 4 : null),
        'utf8'
      )
    }
  }
}

init()
