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
/* eslint-disable no-magic-numbers */
import _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import mkdirp from 'mkdirp';

const JEST_EXTENSION = `.spec.jsx`;
let location;
let logger;

function getTemplate(name) {
    return fs.readFileSync(path.join(__dirname, 'stubs', `${name}.stub`)).toString('utf8');
}

function renderTemplate(template, params) {    
    return _.template(getTemplate(template))(params);
}

function createItShell(interaction) {
    return renderTemplate('it-shell', { interaction: interaction })
        .replace(/\t/gmi, '    ');
}

function createDescribeShell(name, className, relativePath, relativeLibPath) {
    const rlp =
        relativePath.split('/')[0] === '..' ? relativePath : `./${relativePath}`;

    return renderTemplate('describe-shell-start', {
        name: name,
        className: className,
        relativePath: rlp,
        relativeLibPath: relativeLibPath,
    });
}

function createRenderTestShell(className) {
    return renderTemplate('render', { className: className });
}

function createSubComponentTestShell(className) {
    return renderTemplate('subcomponents', { className: className });
}

function createPropTypesShell(className) {
    return renderTemplate('prop-types', { className: className });
}

function createDefaultPropTypesShell(className) {
    return renderTemplate('default-props', { className: className });
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

    return splitCode.splice(0,
        splitCode[end].charAt(0) === '\n' ? end - SECOND_LAST : end - LAST).reduce(toSingleString);
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

    if (its.length > 0) {
        code += its
      .map(createItShell)
      .reduce(toSingleString);
        code += getTemplate('describe-shell-end');

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
      
    let relativeLibPath = '';
    let folders = path.parse(source).dir.split(path.sep).reverse();
    
    for(let ii = 0; ii < folders.length; ii++){
        logger.log(folders[ii]);
        if(folders[ii] == 'lib') break;
        
        relativeLibPath += '../'; 
    }
    
    const code = [
        createDescribeShell(name, name, relativePath, relativeLibPath),
        createRenderTestShell(name),
        createSubComponentTestShell(name),
        createDefaultPropTypesShell(name),
        createPropTypesShell(name),
    ];
    interactions.map(interaction => code.push(createItShell(interaction)));
    code.push(getTemplate('describe-shell-end'));

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

function setupLogger(l) {
    logger = l || console;
    /* eslint-disable */
    if (!logger.skip) logger.skip = () => console.log('Done.');
    if (!logger.write) logger.write = message => console.log(`Writing: ${message}.`);
    if (!logger.pass) logger.pass = () => console.log(`Success! 🎉`);
    /* eslint-enable */
}

export class JestSpeckPlugin {
    constructor(testFileLocation = 'base') {
        location = testFileLocation;
    }

    parse(interactions) {
        return interactions.map(parseInteraction);
    }

    run(l, file, json) {
        if (!(json.name || json.interactions)) return;
        setupLogger(l);
        logger.log(`Generating test file for ${json.name}.`);
        const interactions = this.parse(json.interactions || []);
        const output = path.join(path.dirname(file), path.basename(file, path.parse(file).ext));
        if (!testFileExists(output)) {
            return createNewFile(file, output, json.name, interactions);
        }

        return appendToFile(output, json.name, interactions);
    }
}
