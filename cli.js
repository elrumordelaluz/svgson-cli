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
    $ svgson <input.svg>
    
  Options
	  --output, -o  Output file
	  --pretty, -p  Pretty Output 

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
    flags: { output, pretty, separated },
  } = cli

  let inputStr = ''
  const isDirectory = await checkDirectory(cliInput)

  if (isDirectory) {
    const files = await readdir(cliInput)
    if (files.length) {
      for (const file of files) {
        const _file = await readFile(resolve(cliInput, file))
        if (isSvg(_file)) {
          const parsed = await svgson(_file.toString())
          if (separated) {
            await writeFile(
              `${output || 'svgson'}_${file.replace('.svg', '')}.json`,
              JSON.stringify(parsed, null, pretty ? 4 : null),
              'utf8'
            )
          }
          inputStr = `${inputStr}${_file.toString()}`
        }
      }

      if (!separated) {
        const parsed = await svgson(inputStr)
        await writeFile(
          cli.flags.output || 'svgson.json',
          JSON.stringify(parsed, null, pretty ? 4 : null),
          'utf8'
        )
      }
    }
  } else {
    const file = await readFile(cliInput)
    if (isSvg(file)) {
      const parsed = await svgson(file.toString())
      await writeFile(
        output || 'svgson.json',
        JSON.stringify(parsed, null, pretty ? 4 : null),
        'utf8'
      )
    }
  }
}

init()
