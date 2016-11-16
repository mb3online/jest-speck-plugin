/* speck
  'name': 'JestSpeckPlugin'
  'type': 'Plugin'
  'description': 'Generates a Jest test shell with the given interactions.'
  'props': ''
  'sub-components': []
  'usage':
   'jsx': '''
     <JestSpeckPlugin ...props />
   '''
  'interactions': [
    'can parse interactions from a file.',
    'can generate a test shell from a file.',
    'can append to a file cleanly.',
    'can create a new test file cleanly.'
  ]
*/
import _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import mkdirp from 'mkdirp';

import SpeckPlugin from '../speck.plugin';

const ZERO = 0;

const IT_SHELL = `
\tit('<%= interaction %>', () => {
\t\t// Arrange

\t\t// Act

\t\t// Assert

\t\tfail('Test not implemented.');
\t});`;
const DESCRIBE_SHELL_START = `/* eslint-disable */
import React from 'react';

import { shallow, mount, render } from 'enzyme';
import injectTapEventPlugin from 'react-tap-event-plugin';

import <%= className %> from '<%= relativePath %>';

injectTapEventPlugin();

describe('<%= name %>', () => {`;
const DESCRIBE_SHELL_FINISH = `
});
`;
const JEST_EXTENSION = `.spec.jsx`;
let location;
let logger;

function createItShell(interaction) {
    return _.template(IT_SHELL)({ interaction: interaction }).replace(/\t/gmi, '    ');
}

function createDescribeShell(name, className, relativePath) {
    const rlp =
    relativePath.split('/')[ZERO] === '..' ? relativePath : `./${relativePath}`;

    return _.template(DESCRIBE_SHELL_START)({
        name: name,
        className: className,
        relativePath: rlp,
    });
}

function normalizePath(output) {
    if (!location || location === 'base')
        return `${output}${JEST_EXTENSION}`;
    else return path.join(location, `${path.basename(output)}${JEST_EXTENSION}`);
}

function readTestFile(name) {
    return fs.readFileSync(normalizePath(name), 'utf8');
}

function removeShellFinish(code) {
    const LAST = 1;
    const SECOND_LAST = 2;
    const splitCode = code.split('\n');
    const end = splitCode.length - LAST;

    return splitCode.splice(ZERO,
    splitCode[end].charAt(ZERO) === '\n' ? end - SECOND_LAST : end - LAST)
        .reduce(toSingleString);
}

function isImplemented(code, interaction) {
    return !code.includes(interaction);
}

function toSingleString(a, b) {
    return `${a}\n${b}`;
}

function appendToFile(output, name, its) {
    logger.log(`Appending to test file ${output}${JEST_EXTENSION}`);
    logger.skip();
    const rawCode = readTestFile(output);
    let code = removeShellFinish(rawCode);
    its = its.filter(interaction => isImplemented(code, interaction));

  // something is new
    if (its.length > ZERO) {
        code += its
      .map(createItShell)
      .reduce(toSingleString);
        code += DESCRIBE_SHELL_FINISH;

        return writeToFile(output, code);
    }
}

function writeToFile(output, code) {
    logger.write(`${output}${JEST_EXTENSION}`);

    if (location !== 'base') {
        try {
            fs.lstatSync(location);
        } catch (e) {
            mkdirp.sync(location);
        }
    }

    const fid = fs.writeFileSync(normalizePath(output), code);

    if (!fid)
        logger.pass();

    return code;
}

function createNewFile(source, output, name, interactions) {
    logger.log(`Writting new test file ${output}${JEST_EXTENSION}`);
    logger.skip();
    const relativePath =
    path.join(path.relative(path.resolve(path.dirname(output)), path.dirname(source)),
      path.basename(source));
    const code = [createDescribeShell(name, name, relativePath)];
    interactions.map(interaction => code.push(createItShell(interaction)));
    code.push(DESCRIBE_SHELL_FINISH);

    return writeToFile(output, code.reduce(toSingleString));
}

function testFileExists(output) {
    try {
        return fs.lstatSync(path.resolve(location, `${output}${JEST_EXTENSION}`))
            .isFile();
    } catch (e) {
        return false;
    }
}

function parseInteraction(interaction) {
    if (typeof interaction !== 'string') {
        throw new TypeError('Expecting interaction to be a string.');
    }
    const inter = interaction.trim();

    return inter
        .replace(/can/i, 'should')
        .trim();
}

export class JestSpeckPlugin extends SpeckPlugin {
    constructor(testFileLocation = 'base') {
        super();
        location = testFileLocation;
    }

    parse(interactions) {
        return interactions.map(parseInteraction);
    }

    run(l, file, json) {
        if (!(json.name || json.interactions)) return;
        logger = l;
        logger.log(`Generating test file for ${json.name}.`);
        const interactions = this.parse(json.interactions || []);
        const output = path.join(path.dirname(file), path.basename(file, path.parse(file).ext));
        if (!testFileExists(output)) {
            return createNewFile(file, output, json.name, interactions);
        }

        return appendToFile(output, json.name, interactions);
    }
}
