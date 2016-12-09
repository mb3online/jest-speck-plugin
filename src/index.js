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
let options;
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

function createDescribeShell(name, className, relativePath, relativeRootPath) {
    const rlp =
        relativePath.split('/')[0] === '..' ? relativePath : `./${relativePath}`;

    return renderTemplate('describe-shell-start', {
        name: name,
        className: className,
        relativePath: rlp,
        relativeRootPath: relativeRootPath,
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
    const { outputPath } = options;
    
    if (!outputPath || outputPath === 'base')
        return `${output}${JEST_EXTENSION}`;
    else return path.join(outputPath, `${path.basename(output)}${JEST_EXTENSION}`);
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
    const { outputPath } = options;
    
    logger.write(`${output}${JEST_EXTENSION}`);

    if (outputPath !== 'base') {
        try {
            fs.lstatSync(outputPath);
        } catch (e) {
            mkdirp.sync(outputPath);
        }
    }

    const fid = fs.writeFileSync(normalizePath(output), code);

    if (!fid)
        logger.pass();

    return code;
}

function createNewFile(source, output, name, interactions) {
    const { root } = options;
    
    logger.log(`Writting new test file ${output}${JEST_EXTENSION}`);
    logger.skip();
    const relativePath =
    path.join(path.relative(path.resolve(path.dirname(output)), path.dirname(source)),
      path.basename(source));
      
    let relativeRootPath = './';
    
    if (root){
        const rootPath = path.resolve(root);
        try {
            fs.accessSync(rootPath);
            relativeRootPath = `${path.relative(path.dirname(source), rootPath)}/`;
        } catch(e) {}
    }
    
    const code = [
        createDescribeShell(name, name, relativePath, relativeRootPath),
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
    const { outputPath } = options;
    
    try {
        return fs.lstatSync(path.resolve(outputPath, `${output}${JEST_EXTENSION}`))
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
    constructor(opts) {
        options = Object.assign({ outputPath: 'base' }, opts);
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
